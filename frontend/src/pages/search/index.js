// src/pages/search/index.js
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useCallback, useState } from "react";

import SearchBar from "../../components/searchBar";
import { SearchResults } from "../../components/searchResults";
import { supabase } from "../../data/supabase";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  const [product, setProduct] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  const doSearch = useCallback(async (raw) => {
    const q = String(raw ?? "").trim();
    const qUpper = q.toUpperCase();

    // empty input: clear state (no "not found")
    if (!q) {
      setSearched(false);
      setError(null);
      setProduct(null);
      setPhotoUrl(null);
      return;
    }

    setLoading(true);
    setSearched(true);
    setError(null);
    setProduct(null);
    setPhotoUrl(null);

    try {
      let row = null;

      // 1) exact by tid (as-is)
      {
        const { data, error: e } = await supabase
          .from("product_info")
          .select("tid, epc, description, origin, produced_on")
          .eq("tid", q)
          .maybeSingle();
        if (e) throw e;
        row = data ?? null;
      }

      // 1.1) exact by tid (uppercase fallback, still exact match)
      if (!row && qUpper !== q) {
        const { data, error: e } = await supabase
          .from("product_info")
          .select("tid, epc, description, origin, produced_on")
          .eq("tid", qUpper)
          .maybeSingle();
        if (e) throw e;
        row = data ?? null;
      }

      // 2) exact by epc (as-is)
      if (!row) {
        const { data, error: e } = await supabase
          .from("product_info")
          .select("tid, epc, description, origin, produced_on")
          .eq("epc", q)
          .maybeSingle();
        if (e) throw e;
        row = data ?? null;
      }

      // 2.1) exact by epc (uppercase fallback, still exact match)
      if (!row && qUpper !== q) {
        const { data, error: e } = await supabase
          .from("product_info")
          .select("tid, epc, description, origin, produced_on")
          .eq("epc", qUpper)
          .maybeSingle();
        if (e) throw e;
        row = data ?? null;
      }

      setProduct(row);

      if (row?.tid) {
        const { data: photos, error: photoError } = await supabase
          .from("product_photo")
          .select("photo_url, created_at")
          .eq("tid", row.tid)
          .order("created_at", { ascending: false })
          .limit(1);

        if (photoError) {
          // keep product visible even if image fetch fails
          console.warn("Photo fetch failed", photoError);
          setPhotoUrl(null);
        } else {
          setPhotoUrl(photos?.[0]?.photo_url ?? null);
        }
      }
    } catch (e) {
      setError(e?.message ?? String(e));
      setProduct(null);
      setPhotoUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const showNotFound = searched && !loading && !error && !product;

  return (
    <View style={styles.container}>
      <SearchBar value={query} onChangeText={setQuery} onSearch={doSearch} />

      <View>
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#888"
            style={{ alignSelf: "center", marginVertical: 16 }}
          />
        ) : error ? (
          <Text style={styles.notFound}>{error}</Text>
        ) : showNotFound ? (
          <Text style={styles.notFound}>Item not found</Text>
        ) : null}
      </View>

      <SearchResults product={product} photoUrl={photoUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 16,
    gap: 8,
  },

  notFound: {
    color: "grey",
    alignSelf: "center",
    marginVertical: 16,
  },
});
