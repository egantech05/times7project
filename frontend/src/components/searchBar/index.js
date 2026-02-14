import { StyleSheet, Text, View, TextInput, Pressable} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchBar(){

    return(
        <View style={styles.container}>
            
            <View style={styles.searchRow}>
                <TextInput 
                    style={[styles.input, {outlineStyle: 'none'}]}
                    placeholder="Enter epc or tid"
                    placeholderTextColor="grey"
                
                />
                <Pressable>
                    <Ionicons name="search-outline" size={24} />
                </Pressable>
            </View>
        </View>   
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding:16,
        gap:8,
        borderRadius: 16,
      },

      searchRow:{
        flexDirection:"row",
      },

      input:{
        flex:1,
        borderWidth: 0, 
      },
});