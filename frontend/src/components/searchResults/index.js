import { StyleSheet, Text, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SearchResults({ product, photoUrl }) {
  if (!product) return null;



  return (
    <View style={styles.container}>
      
      <View style={styles.card}>

        <View style={styles.imgBox}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.img} resizeMode="contain" />
          ) : (
            <Ionicons name="image-outline" size={28} color="#FE751A" />
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>epc</Text>
          <Text style={styles.valueBold}>{product?.epc ?? "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>tid</Text>
          <Text style={styles.valueBold}>{product?.tid ?? "-"}</Text>
        </View>

        <View style={styles.info}>
              <Text style={styles.value}>{product?.description ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.valueBold}>{product?.origin ?? "-"}</Text>
              <Text style={styles.valueBold}>{product?.produced_on ?? "-"}</Text>
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
