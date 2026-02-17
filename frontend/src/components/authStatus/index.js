import { StyleSheet, Text, View } from "react-native";

export default function AuthStatus({ auth }) {
  const bg = auth ? "#55E299" : "#E25555";
  const label = auth ? "VALID" : "INVALID";

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={styles.text}>{label}</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    width:100,
  },
  text: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
});
