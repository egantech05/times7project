import { StyleSheet, Text, View } from "react-native";

import AuthStatus from "../authStatus";

import { formatDateTime } from "../../../utils/formatDateTime";


export default function Logs({ auth, date, info, tagId }) {
  return (
    <View style={styles.container}>
      <View style={styles.colWrap}>
        <Text style={styles.date}>{formatDateTime(date).replace(", ", " ")}</Text>
        <Text style={styles.info}>{info}</Text>
        <Text style={styles.tag}>{tagId}</Text>
      </View>
      <AuthStatus auth={auth} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "white",
    gap: 8,
    borderRadius: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },

  colWrap:{
    flexDirection:"column",
    gap:4
  },

  date:{
    fontSize:11,
  },  
  tag:{
    fontSize:11,
    color:"grey",
  }
});