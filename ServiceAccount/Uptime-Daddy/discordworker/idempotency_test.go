package discordworker

import (
	"testing"
	"time"
)

func TestIdempotencySkipsDuplicateWithinTTL(t *testing.T) {
	c := newIdempotencyCache(1 * time.Hour)
	if c.shouldSkipProcessed("a") {
		t.Fatal("first key should not skip")
	}
	c.markProcessed("a")
	if !c.shouldSkipProcessed("a") {
		t.Fatal("duplicate should skip")
	}
}
