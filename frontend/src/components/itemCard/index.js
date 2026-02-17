import { StyleSheet, Text, View, Pressable } from "react-native";
import AuthStatus from "../authStatus";

import { formatDateTime } from "../../../utils/formatDateTime";


export default function ItemCard({ auth, firstSeen, info, tidHex, epcHex, onPress, registered }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.container, registered && styles.registered, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Text style={styles.date}>{formatDateTime(firstSeen).replace(", ", " ")}</Text>
        <AuthStatus auth={auth} />
        {!auth && info ? (
          <Text style={styles.invalidInfo}>{info}</Text>
        ) : null}
      </View>
      <View style={styles.center}>
        <Text style={styles.info}>{epcHex}</Text>

      </View>
      <View style={styles.bottom}>
        <Text style={styles.tag}>{tidHex}</Text>
      </View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  container: {
   
    padding: 16,
    backgroundColor: "#D9D9D9",
    gap: 8,
    borderRadius: 16,
    justifyContent: "space-between",
    alignItems: "center",
    width:160,
    height:200,
  
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },

  top:{
    alignItems:"center",
    gap:4,
    flex:1,
    width: "100%",
  },

  center:{
    flex:1,
    width: "100%",
  },

  bottom: {
    flex: 1,
    width: "100%",          
    alignItems: "center",
    justifyContent: "flex-end",
  },

  info:{
    textAlign:"center",
    flexShrink: 1,          
    flexWrap: "wrap",      
    maxWidth: "100%",
    marginTop:8,
  },


  date:{
    fontSize:11,
  },  
  tag: {
    fontSize: 11,
    color: "grey",
    textAlign: "center",
    flexShrink: 1,          
    flexWrap: "wrap",      
    maxWidth: "100%",
  },

  registered: {
    backgroundColor: "white",
  },

  invalidInfo: {
    color: "#E25555",
    fontSize: 11,
    textAlign: "center",
    fontWeight:"bold",
  },
  
});
