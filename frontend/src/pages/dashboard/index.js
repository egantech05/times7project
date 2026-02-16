import { StyleSheet, Text, View, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";

import { supabase } from "../../data/supabase";


import ItemCard from "../../components/itemCard";
import useActiveTags from "../../hooks/useActiveTags";
import StatusDot from "../../components/statusDot";
import { ViewItem } from "../../components/viewItem";
import { NewProduct } from "../../components/newProduct";

export default function Dashboard() {
  const { scans, status, error } = useActiveTags({ intervalMs: 1000 });

  const [selectedItem, setSelectedItem] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const [registeredTids, setRegisteredTids] = useState([]);
  const [selectedRegistered, setSelectedRegistered] = useState(false);


  const isLive = status === "live";

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from("product_info").select("tid");
      if (error) { console.log("Supabase error", error); return; }
      if (alive) setRegisteredTids((data ?? []).map(r => String(r.tid)));
    })();
    return () => { alive = false; };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
       <View style={styles.rowWrap}>
          <Ionicons name="radio-outline" size={24} />
          <Text style={styles.pageTitle}>Detected Items</Text>
        </View>
        <View style={styles.rowWrap}>
          <View style={styles.statusPill}>
            <Ionicons name="git-branch-outline" size={24} />
            <StatusDot live={isLive} />
          </View>
          <View style={styles.statusPill}>
            <Ionicons name="radio-outline" size={24} />
            <StatusDot live={isLive} />
          </View>
        </View>
      </View>

      {status === "error" ? (
        <Text style={styles.empty}>Gateway Offline</Text>
      ) : scans.length === 0 ? (
        <Text style={styles.empty}>No item in range</Text>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.cardList}
          showsVerticalScrollIndicator={false}
        >
          {scans.map((item) => (
            <ItemCard
              key={item.id}
              auth={item.auth}
              date={item.date}
              info={item.info}
              id={item.id}
              registered={registeredTids.includes(String(item.id))}


              onPress={() => {
                const isRegistered = registeredTids.includes(String(item.id));
                setSelectedRegistered(isRegistered);
                setSelectedItem(item);
                setIsOpen(true);
              }}
            />
          ))}
        </ScrollView>
      )}


      <Modal visible={isOpen} animationType="slide" transparent>
        {selectedRegistered ? (
          <ViewItem item={selectedItem} onClose={() => setIsOpen(false)} />
        ) : (
          <NewProduct item={selectedItem} onClose={() => setIsOpen(false)} />
        )}

      </Modal>
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

  cardList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 24,
  },

  statusBar:{
    flexDirection:"row",
    justifyContent:"space-between"
  },

  statusPill:{
    flexDirection:"row",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical:4,
    paddingHorizontal:16,
    borderRadius:16,
  },
});