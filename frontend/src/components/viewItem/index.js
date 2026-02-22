import { StyleSheet, Text, View, Pressable, TextInput, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { supabase } from "../../data/supabase";
import SubmitButton from "../submitButton";
import * as ImagePicker from "expo-image-picker";

const BUCKET = "product-photos";

export function ViewItem({ item, onClose }) {
  const [product, setProduct] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [draftOrigin, setDraftOrigin] = useState("");
  const [draftProducedOn, setDraftProducedOn] = useState("");
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    let alive = true;

    if (!item?.epcHex) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setLoadError(null);

      const epc = String(item?.epcHex);

      const { data: productRow, error: productError } = await supabase
        .from("product_info")
        .select("epc, description, origin, produced_on")
        .eq("epc", epc)
        .maybeSingle();

      if (productError) throw productError;

      const { data: photos, error: photoError } = await supabase
        .from("product_photo")
        .select("photo_url, created_at")
        .eq("epc", epc)
        .order("created_at", { ascending: false })
        .limit(1);


      if (photoError) throw photoError;

      if (!alive) return;
      setProduct(productRow ?? null);
      setPhotoUrl(photos?.[0]?.photo_url ?? null);
    })()
      .catch((e) => {
        if (alive) setLoadError(e?.message ?? String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [item?.epcHex]);

  useEffect(() => {
    if (!product) return;
    setDraftDescription(product.description ?? "");
    setDraftOrigin(product.origin ?? "");
    setDraftProducedOn(product.produced_on ?? "");
  }, [product]);

  const saveEdit = async () => {
    if (!item?.id) return;
    setSaving(true);
    try {
      const epc = String(item.epcHex);

      const { error: infoError } = await supabase
        .from("product_info")
        .update({
          description: draftDescription || null,
          origin: draftOrigin || null,
          produced_on: draftProducedOn || null,
        })
        .eq("epc", epc);


      if (infoError) throw infoError;

      if (imageUri) {
        const path = `${epc}/${Date.now()}.jpg`;
        const blob = await (await fetch(imageUri)).blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: blob.type || "image/jpeg" });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(uploadData.path);

        const newUrl = publicData.publicUrl;

        const { error: photoError } = await supabase
          .from("product_photo")
          .insert({ epc, photo_url: newUrl });


        if (photoError) throw photoError;

        setPhotoUrl(newUrl);
        setImageUri(null);
      }

      setProduct((p) =>
        p
          ? {
              ...p,
              description: draftDescription,
              origin: draftOrigin,
              produced_on: draftProducedOn,
            }
          : p
      );

      setIsEditing(false);
    } catch (e) {
      Alert.alert("Save failed", e?.message ?? String(e));
    } finally {
      setSaving(false);
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
          <Pressable onPress={() => setIsEditing((v) => !v)} style={styles.editbtn}>
            <Ionicons name="create-outline" size={22} color="grey" />
          </Pressable>
          <Pressable onPress={onClose} style={styles.closebtn}>
            <Ionicons name="close-outline" size={24} color="grey" />
          </Pressable>
        </View>


        {isEditing ? (
          <Pressable onPress={pickImage} style={styles.imgBox}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.img} resizeMode="contain" />
            ) : photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.img} resizeMode="contain" />
            ) : (
              <Ionicons name="image-outline" size={28} color="#9AA0A6" />
            )}
          </Pressable>
        ) : (
          <View style={styles.imgBox}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.img} resizeMode="contain" />
            ) : (
              <Ionicons name="image-outline" size={28} color="#9AA0A6" />
            )}
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.label}>epc</Text>
          <Text style={styles.valueBold}>{product?.epc ?? item?.epcHex ?? "-"}</Text>
        </View>

        {loading ? (
          <Text style={styles.label}>Loading...</Text>
        ) : loadError ? (
          <Text style={styles.label}>{loadError}</Text>
        ) : !isEditing ? (
          <>
            <View style={styles.info}>
              <Text style={styles.value}>{product?.description ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.valueBold}>{product?.origin ?? "-"}</Text>
              <Text style={styles.valueBold}>{product?.produced_on ?? "-"}</Text>
            </View>
          </>
        ) : (
          <View style={styles.editBox}>
            <Text style={styles.editLabel}>Description</Text>
            <TextInput
              value={draftDescription}
              onChangeText={setDraftDescription}
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Product description"
              placeholderTextColor="#9AA0A6"
              multiline
            />

            <Text style={styles.editLabel}>Origin</Text>
            <TextInput
              value={draftOrigin}
              onChangeText={setDraftOrigin}
              style={styles.input}
              placeholder="e.g. Malaysia"
              placeholderTextColor="#9AA0A6"
            />

            <Text style={styles.editLabel}>Produced on</Text>
            <TextInput
              value={draftProducedOn}
              onChangeText={setDraftProducedOn}
              style={styles.input}
              placeholder="e.g. 2026-02-14"
              placeholderTextColor="#9AA0A6"
              autoCapitalize="none"
            />
          </View>
        )}

        {isEditing ? (
          <SubmitButton label={saving ? "Saving..." : "Save"} onPress={saveEdit} disabled={saving} />
        ) : null}
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

  closebtn: {},

  editbtn: {},

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

  editBox: {
    gap: 10,
  },

  editLabel: {
    color: "grey",
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
});
