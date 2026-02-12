import { Pressable, StyleSheet, Text } from "react-native";

export default function SubmitButton({ label = "Submit", color = "#2a2a2aff", onPress, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
  },
});
