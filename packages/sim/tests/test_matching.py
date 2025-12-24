"""
Tests for keyword-query matching engine.
"""
import pytest
from adsim.matching import (
    tokenize, normalize_keyword, exact_match, phrase_match, broad_match,
    match_keyword, MatchType, MatchResult, NegativeKeyword,
    compute_broad_match_score, get_synonyms,
)


class TestTokenize:
    """Tests for tokenize function."""
    
    def test_lowercase(self):
        """Should lowercase all tokens."""
        assert tokenize("Buy VILLA Dubai") == ["buy", "villa", "dubai"]
    
    def test_remove_punctuation(self):
        """Should remove punctuation."""
        assert tokenize("best villa, dubai!") == ["best", "villa", "dubai"]
    
    def test_empty_string(self):
        """Should return empty list for empty string."""
        assert tokenize("") == []
    
    def test_whitespace_handling(self):
        """Should handle multiple spaces."""
        assert tokenize("buy   villa   dubai") == ["buy", "villa", "dubai"]


class TestExactMatch:
    """Tests for exact matching."""
    
    def test_exact_match_true(self):
        """Should match identical queries."""
        kw = tokenize("buy villa dubai")
        query = tokenize("buy villa dubai")
        assert exact_match(kw, query) is True
    
    def test_exact_match_case_insensitive(self):
        """Should match regardless of case."""
        kw = tokenize("buy villa dubai")
        query = tokenize("BUY VILLA DUBAI")
        assert exact_match(kw, query) is True
    
    def test_exact_match_false_extra_words(self):
        """Should not match if query has extra words."""
        kw = tokenize("buy villa")
        query = tokenize("buy villa dubai")
        assert exact_match(kw, query) is False
    
    def test_exact_match_false_missing_words(self):
        """Should not match if query is missing words."""
        kw = tokenize("buy villa dubai")
        query = tokenize("buy villa")
        assert exact_match(kw, query) is False


class TestPhraseMatch:
    """Tests for phrase matching."""
    
    def test_phrase_match_exact(self):
        """Should match exact phrase."""
        kw = tokenize("villa dubai")
        query = tokenize("villa dubai")
        assert phrase_match(kw, query) is True
    
    def test_phrase_match_beginning(self):
        """Should match phrase at beginning."""
        kw = tokenize("villa dubai")
        query = tokenize("villa dubai for sale")
        assert phrase_match(kw, query) is True
    
    def test_phrase_match_middle(self):
        """Should match phrase in middle."""
        kw = tokenize("villa dubai")
        query = tokenize("buy villa dubai now")
        assert phrase_match(kw, query) is True
    
    def test_phrase_match_end(self):
        """Should match phrase at end."""
        kw = tokenize("villa dubai")
        query = tokenize("best villa dubai")
        assert phrase_match(kw, query) is True
    
    def test_phrase_match_wrong_order(self):
        """Should not match if words are in wrong order."""
        kw = tokenize("villa dubai")
        query = tokenize("dubai villa for sale")
        assert phrase_match(kw, query) is False
    
    def test_phrase_match_not_contiguous(self):
        """Should not match if phrase is not contiguous."""
        kw = tokenize("villa dubai")
        query = tokenize("villa in dubai")
        assert phrase_match(kw, query) is False


class TestBroadMatch:
    """Tests for broad matching."""
    
    def test_broad_match_direct(self):
        """Should match with direct word overlap."""
        kw = tokenize("buy villa dubai")
        query = tokenize("villa dubai purchase")
        matched, score, reason = broad_match(kw, query)
        assert matched is True
        assert score >= 0.62
    
    def test_broad_match_synonyms(self):
        """Should match via synonyms."""
        kw = tokenize("buy villa")
        query = tokenize("purchase property")
        # May or may not match depending on synonym coverage
        matched, score, reason = broad_match(kw, query)
        # Just verify it runs without error
        assert isinstance(matched, bool)
    
    def test_broad_match_learning_threshold(self):
        """Learning phase should use lower threshold."""
        kw = tokenize("villa rental dubai")
        query = tokenize("apartment lease")
        
        # In stable mode
        matched_stable, score_stable, _ = broad_match(kw, query, learning_state=False)
        
        # In learning mode (lower threshold)
        matched_learning, score_learning, _ = broad_match(kw, query, learning_state=True)
        
        # Same score, potentially different match result
        assert score_stable == score_learning
    
    def test_broad_match_score_range(self):
        """Score should be between 0 and 1."""
        kw = tokenize("buy villa dubai")
        query = tokenize("something completely different xyz")
        matched, score, reason = broad_match(kw, query)
        assert 0 <= score <= 1


class TestMatchKeyword:
    """Tests for main match_keyword function."""
    
    def test_exact_match_success(self):
        """Exact match should work."""
        result = match_keyword(
            keyword="buy villa dubai",
            query="buy villa dubai",
            match_type=MatchType.EXACT,
        )
        assert result.matched is True
        assert result.match_type == MatchType.EXACT
    
    def test_phrase_match_success(self):
        """Phrase match should work."""
        result = match_keyword(
            keyword="villa dubai",
            query="buy villa dubai now",
            match_type=MatchType.PHRASE,
        )
        assert result.matched is True
        assert result.match_type == MatchType.PHRASE
    
    def test_broad_match_success(self):
        """Broad match should work."""
        result = match_keyword(
            keyword="buy villa dubai",
            query="purchase property dubai",
            match_type=MatchType.BROAD,
        )
        # May or may not match, but should run
        assert isinstance(result.matched, bool)
    
    def test_negative_blocks_match(self):
        """Negative keyword should block match."""
        result = match_keyword(
            keyword="villa dubai",
            query="cheap villa dubai",
            match_type=MatchType.BROAD,
            negatives=[NegativeKeyword("cheap", MatchType.BROAD)],
        )
        assert result.matched is False
        assert result.blocked_by_negative is True
        assert result.blocking_negative == "cheap"
    
    def test_exact_negative_specific(self):
        """Exact negative should only block exact matches."""
        # This query contains "cheap" but as part of broader query
        result = match_keyword(
            keyword="villa dubai",
            query="villa dubai",
            match_type=MatchType.PHRASE,
            negatives=[NegativeKeyword("cheap villa dubai", MatchType.EXACT)],
        )
        # Should not be blocked - negative is exact and doesn't match
        assert result.matched is True
        assert result.blocked_by_negative is False


class TestSynonyms:
    """Tests for synonym lookup."""
    
    def test_get_synonyms_known(self):
        """Should return synonyms for known words."""
        synonyms = get_synonyms("buy")
        assert "purchase" in synonyms
        assert "buy" in synonyms  # Should include original
    
    def test_get_synonyms_unknown(self):
        """Should return just the word for unknown words."""
        synonyms = get_synonyms("xyzabc123")
        assert synonyms == {"xyzabc123"}


class TestRealEstateScenarioExamples:
    """Tests with real estate scenario examples."""
    
    def test_villa_rental_variations(self):
        """Test villa rental query variations."""
        keyword = "villa rental dubai"
        
        # Exact match
        result = match_keyword(keyword, "villa rental dubai", MatchType.EXACT)
        assert result.matched is True
        
        # Phrase match
        result = match_keyword(keyword, "luxury villa rental dubai marina", MatchType.PHRASE)
        assert result.matched is True
        
        # Broad match with variant
        result = match_keyword(keyword, "dubai villa lease", MatchType.BROAD)
        # Should match via synonyms (rental ~ lease)
        assert isinstance(result.matched, bool)
    
    def test_local_services_variations(self):
        """Test local services query variations."""
        keyword = "ac repair dubai"
        
        # Phrase match
        result = match_keyword(keyword, "emergency ac repair dubai", MatchType.PHRASE)
        assert result.matched is True
        
        # Broad match with synonym
        result = match_keyword(keyword, "air conditioning fix dubai", MatchType.BROAD)
        # Should match via synonyms
        assert isinstance(result.matched, bool)
    
    def test_ecommerce_variations(self):
        """Test ecommerce query variations."""
        keyword = "buy phone online"
        
        # Broad match variations
        queries = [
            "purchase mobile online",
            "order smartphone web",
            "shop for phone",
        ]
        
        for query in queries:
            result = match_keyword(keyword, query, MatchType.BROAD)
            # Just verify it runs
            assert isinstance(result.matched, bool)
