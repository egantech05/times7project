import { ActivityIndicator, StyleSheet, Text, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Logs from "../../components/logs"

import React, { useEffect, useState } from "react";
import { supabase } from "../../data/supabase";


export default function LogsPage() {

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let isMounted = true;
  
    (async () => {
      const { data: rows, error } = await supabase
        .from("data")
        .select("*")
        .order("first_seen", { ascending: false })
  
      if (error) {
        console.log("Supabase error", error);
        return;
      }
  
      if (isMounted) setData(rows ?? []);
    })();
  
    return () => { isMounted = false; };
  }, []);

  //for loading spinner

  useEffect(() => {
    let isMounted = true;
  
    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from("data")
          .select("*")
          .order("first_seen", { ascending: false })
  
        if (error) {
          console.log("Supabase error", error);
          return;
        }
  
        if (isMounted) setData(rows ?? []);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
  
    return () => { isMounted = false; };
  }, []);
  
  
    

  return (
    <View style={styles.container}>
     
      <View style={styles.rowWrap}>
        <Ionicons name="document-text-outline" size={24} />
        <Text style={styles.pageTitle}>
          Logs
        </Text>
      </View>

      {loading ? (
  <View style={styles.loader}>
    <ActivityIndicator size="small" color="#888" />
  </View>
      ) : data.length === 0 ? (
        <Text style={styles.empty}>No logs yet</Text>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
        {data.map(item => (
          <Logs
            key={`${item.tid_hex}-${item.first_seen}`}
            auth={item.auth}
            date={item.first_seen}
            epcHex={item.epc_hex}
            tidHex={item.tid_hex}
          />
        ))}
        </ScrollView>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding:16,
    gap:8,
  },

  pageTitle:{
    fontSize: 16,
    fontWeight:"bold",
    color: "#2a2a2aff",
  },

  rowWrap:{
    flexDirection:"row",
    gap:8,  
    alignItems: "center",
    marginLeft: 16,
  },

  cardList:{

  },

  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 24,
  },
  
});