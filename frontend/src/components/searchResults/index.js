import { StyleSheet, Text, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SearchResults({ }) {




  return (
    <View style={styles.container}>
      
      <View style={styles.card}>

        <View style={styles.imgBox}>
            <Ionicons name="image-outline" size={28} color="#9AA0A6" />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>epc</Text>
          <Text style={styles.valueBold}> EIUWH218372198372189 </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>tid</Text>
          <Text style={styles.valueBold}>2298392847398247</Text>
        </View>

        <View style={styles.info}>
              <Text style={styles.value}>I put descriptions here and here and here weee</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.valueBold}>Malaysia</Text>
              <Text style={styles.valueBold}>1992.09.05</Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginVertical: 24,
    gap: 14,
  },

  imgBox: {
    backgroundColor: "white",
    height: 160,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  img: { width: "100%", height: "100%" },

  info: {
    marginVertical: 8,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  label: {
    color: "grey",
  },

  value: {},

  valueBold: {
    fontWeight: "bold",
  },


});
