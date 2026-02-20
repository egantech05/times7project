import { StyleSheet, Text, View, Pressable, TextInput, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../data/supabase";



import { todayDate } from "../../../utils/formatDateTime";
import SubmitButton from "../submitButton";






export function NewProduct({ item, onClose, onRegistered }) {
  const [date, setDate] = useState(() => todayDate());
  const [imageUri, setImageUri] = useState(null);
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const BUCKET = "product-photos"; 

const handleRegister = async () => {

  if (!item?.epcHex) return Alert.alert("Missing epc", "No EPC found.");

  setSubmitting(true);
  try {
    const epc = String(item.epcHex);

    const { error: infoError } = await supabase
      .from("product_info")
      .upsert(
        { epc, description, origin, produced_on: date || null },
        { onConflict: "epc" }
      );


    if (infoError) throw infoError;

    if (imageUri) {
      const path = `${epc}/${Date.now()}.jpg`;

      const blob = await (await fetch(imageUri)).blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type || "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
      const photoUrl = publicData.publicUrl;

      const { error: photoError } = await supabase
        .from("product_photo")
        .insert({ epc, photo_url: photoUrl });


      if (photoError) throw photoError;
    }

    Alert.alert("Registered", "Saved to database.");
    onRegistered?.(epc);
    onClose?.();
  } catch (e) {
    Alert.alert("Register failed", e?.message ?? String(e));
  } finally {
    setSubmitting(false);
  }
};



  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to pick an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };


    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
              <Pressable onPress={onClose} style={styles.closebtn}><Ionicons name="close-outline" size={24} color="grey" /></Pressable>
          </View>

          <Pressable onPress={pickImage} style={[styles.imgBox, imageUri && styles.imgBoxUploaded]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.img} resizeMode="contain" />
            ) : (
              <Ionicons name="image-outline" size={28} color="#FE751A" />
            )}
          </Pressable>

          <View style={styles.infoRow}>
              <Text style={styles.label}> epc </Text>
              <Text style={styles.valueBold}>{item?.epcHex}</Text>
          </View>

          <View style={styles.info}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Product description"
                placeholderTextColor="#9AA0A6"
                multiline
                value={description}
                onChangeText={setDescription}
              />
          </View>
          <View style={styles.info}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Origin"
                placeholderTextColor="#9AA0A6"
                value={origin}
                onChangeText={setOrigin}
              />
          </View>
          <View style={styles.info}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9AA0A6"
                value={date}
                onChangeText={setDate}

              />
          </View>

          <SubmitButton
          label="Register"
          onPress={handleRegister}
          disabled={submitting}
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

      imgBox: {
        backgroundColor: "#F5F5F5",
        height: 240,
        borderRadius: 8,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      },

      imgBoxUploaded: {
        backgroundColor: "#FFFFFF",
      },

      img: {
        width: "100%",
        height: "100%",
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
