"""
Keyword-query matching engine.

Implements exact, phrase, and broad matching with negative keyword handling.
"""
from dataclasses import dataclass
from enum import Enum
import re


class MatchType(str, Enum):
    """Keyword match types."""
    EXACT = "exact"
    PHRASE = "phrase"
    BROAD = "broad"


@dataclass
class MatchResult:
    """Result of a keyword-query match attempt."""
    matched: bool
    match_type: MatchType | None
    match_reason: str
    match_score: float = 1.0  # For broad match, the confidence score
    blocked_by_negative: bool = False
    blocking_negative: str | None = None


@dataclass
class NegativeKeyword:
    """A negative keyword that blocks matches."""
    text: str
    match_type: MatchType


def tokenize(text: str) -> list[str]:
    """
    Tokenize and normalize text for matching.
    
    - Lowercase
    - Remove punctuation
    - Split on whitespace
    - Remove empty tokens
    """
    # Lowercase and remove non-alphanumeric (except spaces)
    normalized = re.sub(r'[^\w\s]', '', text.lower())
    # Split and filter empty
    tokens = [t.strip() for t in normalized.split() if t.strip()]
    return tokens


def normalize_keyword(keyword: str) -> str:
    """Normalize a keyword for comparison."""
    return ' '.join(tokenize(keyword))


def exact_match(keyword_tokens: list[str], query_tokens: list[str]) -> bool:
    """
    Check if query exactly matches keyword.
    
    Exact match requires the query to be identical to the keyword
    after normalization.
    """
    return keyword_tokens == query_tokens


def phrase_match(keyword_tokens: list[str], query_tokens: list[str]) -> bool:
    """
    Check if keyword phrase appears in query.
    
    Phrase match requires all keyword tokens to appear in the query
    in the same order, as a contiguous sequence.
    """
    if not keyword_tokens:
        return False
    if len(keyword_tokens) > len(query_tokens):
        return False
    
    # Sliding window search
    keyword_len = len(keyword_tokens)
    for i in range(len(query_tokens) - keyword_len + 1):
        if query_tokens[i:i + keyword_len] == keyword_tokens:
            return True
    return False


# Common synonym mappings for broad match
SYNONYMS = {
    "buy": ["purchase", "get", "acquire", "order"],
    "cheap": ["affordable", "low cost", "budget", "inexpensive"],
    "best": ["top", "premier", "leading", "excellent"],
    "near": ["nearby", "close to", "around", "local"],
    "rent": ["lease", "hire", "rental"],
    "apartment": ["flat", "unit", "condo"],
    "villa": ["house", "home", "property"],
    "service": ["services", "help", "assistance"],
    "repair": ["fix", "fixing", "maintenance"],
    "cleaning": ["clean", "cleaner", "housekeeping"],
    "ac": ["air conditioning", "air conditioner", "hvac"],
    "plumber": ["plumbing", "plumbers"],
    "electrician": ["electrical", "electric"],
    "dubai": ["dxb"],
    "abu dhabi": ["abudhabi", "ad"],
    "uae": ["emirates", "united arab emirates"],
    "price": ["cost", "pricing", "rate", "rates"],
    "discount": ["sale", "offer", "deal", "deals"],
    "shop": ["store", "shopping", "buy"],
    "delivery": ["shipping", "deliver"],
    "online": ["web", "internet", "digital"],
}


def get_synonyms(word: str) -> set[str]:
    """Get synonyms for a word."""
    synonyms = {word}
    # Check if word is a key
    if word in SYNONYMS:
        synonyms.update(SYNONYMS[word])
    # Check if word is in any synonym list
    for key, syn_list in SYNONYMS.items():
        if word in syn_list:
            synonyms.add(key)
            synonyms.update(syn_list)
    return synonyms


def compute_broad_match_score(
    keyword_tokens: list[str],
    query_tokens: list[str],
) -> tuple[float, str]:
    """
    Compute broad match score between keyword and query.
    
    Score formula:
    broadMatchScore = 0.6 * topic_overlap + 0.25 * synonym_hit + 0.15 * context_fit
    
    Returns:
        (score, reason) tuple
    """
    if not keyword_tokens or not query_tokens:
        return 0.0, "empty_input"
    
    query_set = set(query_tokens)
    keyword_set = set(keyword_tokens)
    
    # Topic overlap: fraction of keyword tokens that appear in query (directly or via synonym)
    direct_matches = 0
    synonym_matches = 0
    
    for kw_token in keyword_tokens:
        if kw_token in query_set:
            direct_matches += 1
        else:
            # Check synonyms
            kw_synonyms = get_synonyms(kw_token)
            if kw_synonyms & query_set:
                synonym_matches += 1
    
    topic_overlap = (direct_matches + 0.8 * synonym_matches) / len(keyword_tokens)
    
    # Synonym hit: bonus for matching via synonyms
    synonym_hit = synonym_matches / len(keyword_tokens) if keyword_tokens else 0
    
    # Context fit: penalty for very different query lengths
    length_ratio = min(len(query_tokens), len(keyword_tokens)) / max(len(query_tokens), len(keyword_tokens))
    context_fit = length_ratio
    
    # Combined score
    score = 0.6 * topic_overlap + 0.25 * synonym_hit + 0.15 * context_fit
    
    reason = f"topic={topic_overlap:.2f}, synonym={synonym_hit:.2f}, context={context_fit:.2f}"
    
    return score, reason


def broad_match(
    keyword_tokens: list[str],
    query_tokens: list[str],
    learning_state: bool = False,
) -> tuple[bool, float, str]:
    """
    Check if query broadly matches keyword.
    
    Uses scoring formula:
    broadMatchScore = 0.6 * topic_overlap + 0.25 * synonym_hit + 0.15 * context_fit
    
    Thresholds:
    - Stable (learning_state=False): 0.62
    - Learning (learning_state=True): 0.58
    
    Returns:
        (matched, score, reason) tuple
    """
    threshold = 0.58 if learning_state else 0.62
    
    score, reason = compute_broad_match_score(keyword_tokens, query_tokens)
    matched = score >= threshold
    
    return matched, score, f"score={score:.3f} (threshold={threshold}): {reason}"


def check_negative_block(
    query_tokens: list[str],
    negatives: list[NegativeKeyword],
    neg_quality: float = 1.0,
) -> tuple[bool, str | None]:
    """
    Check if query is blocked by any negative keyword.
    
    Args:
        query_tokens: Tokenized query
        negatives: List of negative keywords
        neg_quality: Quality factor (0-1) that reduces blocking probability
                     Lower quality = more leakage
    
    Returns:
        (blocked, blocking_negative) tuple
    """
    for neg in negatives:
        neg_tokens = tokenize(neg.text)
        
        blocked = False
        
        if neg.match_type == MatchType.EXACT:
            blocked = exact_match(neg_tokens, query_tokens)
        elif neg.match_type == MatchType.PHRASE:
            blocked = phrase_match(neg_tokens, query_tokens)
        elif neg.match_type == MatchType.BROAD:
            # Broad negatives block if any token matches
            query_set = set(query_tokens)
            for neg_token in neg_tokens:
                if neg_token in query_set or get_synonyms(neg_token) & query_set:
                    blocked = True
                    break
        
        if blocked:
            # Apply neg_quality factor - lower quality means some leakage
            # At neg_quality=1.0, always blocks
            # At neg_quality=0.5, 50% chance to leak through
            if neg_quality >= 1.0:
                return True, neg.text
            # For simplicity, we deterministically block based on threshold
            # In actual simulation, use RNG
            return True, neg.text
    
    return False, None


def match_keyword(
    keyword: str,
    query: str,
    match_type: MatchType,
    negatives: list[NegativeKeyword] | None = None,
    learning_state: bool = False,
    neg_quality: float = 1.0,
) -> MatchResult:
    """
    Main matching function.
    
    Checks if a query matches a keyword according to the match type,
    then checks if any negatives block the match.
    
    Args:
        keyword: The keyword text
        query: The search query
        match_type: Keyword match type (exact, phrase, broad)
        negatives: List of negative keywords
        learning_state: Whether the account is in learning phase
        neg_quality: Quality factor for negative blocking (0-1)
    
    Returns:
        MatchResult with match status and details
    """
    keyword_tokens = tokenize(keyword)
    query_tokens = tokenize(query)
    
    # Check for match based on match type
    matched = False
    match_score = 1.0
    match_reason = ""
    
    if match_type == MatchType.EXACT:
        matched = exact_match(keyword_tokens, query_tokens)
        match_reason = "exact_match" if matched else "no_exact_match"
        
    elif match_type == MatchType.PHRASE:
        matched = phrase_match(keyword_tokens, query_tokens)
        match_reason = "phrase_match" if matched else "no_phrase_match"
        
    elif match_type == MatchType.BROAD:
        matched, match_score, match_reason = broad_match(
            keyword_tokens, query_tokens, learning_state
        )
    
    # If no match, return early
    if not matched:
        return MatchResult(
            matched=False,
            match_type=None,
            match_reason=match_reason,
            match_score=0.0,
        )
    
    # Check negatives
    if negatives:
        blocked, blocking_neg = check_negative_block(
            query_tokens, negatives, neg_quality
        )
        if blocked:
            return MatchResult(
                matched=False,
                match_type=match_type,
                match_reason=f"blocked_by_negative: {blocking_neg}",
                match_score=match_score,
                blocked_by_negative=True,
                blocking_negative=blocking_neg,
            )
    
    return MatchResult(
        matched=True,
        match_type=match_type,
        match_reason=match_reason,
        match_score=match_score,
    )
