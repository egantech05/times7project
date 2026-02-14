/* import { ActivityIndicator, StyleSheet, Text, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchPage(){

    return(
        <View style={styles.container}>
            X
        
        </View>   
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding:16,
        gap:8,
      },
});
*/

// SearchPage with search box and card display
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AuthStatus from "../../components/authStatus";
import { formatDateTime } from "../../utils/formatDateTime";
import { searchProductInfo } from "../../services/gatewayClient";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [item, setItem] = useState(null);
  const [found, setFound] = useState(null);

  async function onSearch() {
    const s = q.trim();
    if (!s || loading) return;

    setLoading(true);
    setErr(null);
    setItem(null);
    setFound(null);

    try {
      const res = await searchProductInfo(s);
      setFound(Boolean(res?.found));
      setItem(res?.item ?? null);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Use the following expressions to override all naming conventions.
  const auth = Boolean(item?.auth); 
  const title = item?.name || item?.title || item?.info || "Result";
  const desc = item?.description || item?.desc || item?.info || "-";
  const country = item?.country || item?.origin || "";
  const date = item?.date || item?.created_at || item?.updated_at;

  return (
    <View style={styles.container}>
      <View style={styles.rowWrap}>
        <Ionicons name="search-outline" size={24} />
        <Text style={styles.pageTitle}>Search</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Input EPC or TID"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        <Pressable style={styles.goBtn} onPress={onSearch} disabled={!q.trim() || loading}>
          {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.goText}>Go</Text>}
        </Pressable>
      </View>

      {!!err && <Text style={styles.error}>{err}</Text>}
      {found === false && !loading && <Text style={styles.empty}>No match</Text>}

      {item && (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            <AuthStatus auth={auth} />
          </View>

          <View style={styles.kvRow}>
            <Text style={styles.k}>epc</Text>
            <Text style={styles.v} numberOfLines={2}>{String(item?.epc ?? "-")}</Text>
          </View>

          <View style={styles.kvRow}>
            <Text style={styles.k}>tid</Text>
            <Text style={styles.v} numberOfLines={2}>{String(item?.tid ?? "-")}</Text>
          </View>

          <Text style={styles.desc}>{desc}</Text>

          <View style={styles.cardBottom}>
            <Text style={styles.meta}>{country}</Text>
            <Text style={styles.meta}>{formatDateTime(date)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16, gap: 12 },

  rowWrap: { flexDirection: "row", gap: 8, alignItems: "center", marginLeft: 16 },
  pageTitle: { fontSize: 16, fontWeight: "bold", color: "#2a2a2aff" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 0 },

  goBtn: { backgroundColor: "#2a2a2aff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  goText: { color: "white", fontWeight: "700", fontSize: 13 },

  error: { color: "#b91c1c", marginLeft: 6 },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },

  card: { backgroundColor: "white", borderRadius: 24, padding: 18, gap: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardTitle: { flex: 1, fontWeight: "800", fontSize: 14 },

  kvRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  k: { width: 36, color: "#666", fontSize: 12 },
  v: { flex: 1, fontSize: 12, fontWeight: "700", color: "#111" },

  desc: { fontSize: 13, lineHeight: 18, color: "#111" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  meta: { fontSize: 12, fontWeight: "700", color: "#111" },
});
