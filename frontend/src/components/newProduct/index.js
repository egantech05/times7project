import { StyleSheet, Text, View, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { todayDate } from "../../../utils/formatDateTime";
import SubmitButton from "../submitButton";






export function NewProduct({ item, onClose }) {
  const [date, setDate] = useState(() => todayDate());

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
              <Pressable onPress={onClose} style={styles.closebtn}><Ionicons name="close-outline" size={24} color="grey" /></Pressable>
          </View>
          <View style={styles.imgBox}>

          </View>
          <View style={styles.infoRow}>
              <Text style={styles.label}> epc </Text>
              <Text style={styles.valueBold}>{item?.info}</Text>
          </View>
          <View style={styles.infoRow}>
              <Text style={styles.label}> tid </Text>
              <Text style={styles.valueBold}>{item?.id}</Text>
          </View>

          <View style={styles.info}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Product description"
                placeholderTextColor="#9AA0A6"
                multiline
              />
          </View>
          <View style={styles.info}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Origin"
                placeholderTextColor="#9AA0A6"
              />
          </View>
          <View style={styles.info}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Date"
                placeholderTextColor="#9AA0A6"
                value={date}
                onChangeText={setDate}

              />
          </View>

          <SubmitButton
            label="Register"
            color="#2a2a2aff"
            onPress={() => {
              // TODO: submit/register here
            }}
          />
         
        </View>
      </View>
    );
  }

  
  const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "rgba(10, 12, 18, 0.80)",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },

    header:{
        flexDirection:"row",
        alignItems:"center",
        justifyContent: "flex-end"
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

      closebtn:{

      },

      imgBox:{
        backgroundColor: "#F5F5F5",
        height: 160,
        borderRadius: 8,
      },

      info:{
        marginVertical: 8,
      },

      infoRow:{
        flexDirection: "row",
        justifyContent: "space-between",
      },

      label:{
        color: "grey",
      },
      value: {
     
      },

      input: {
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#111111",
        backgroundColor: "#FFFFFF",
      },

      textArea: {
        minHeight: 80,
        textAlignVertical: "top",
      },

      rowInput: {
        flex: 1,
      },

      valueBold: {
        fontWeight: "bold",
      },




  });
