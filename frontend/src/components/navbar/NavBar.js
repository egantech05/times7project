import { View, StyleSheet, Text, Pressable } from "react-native";
import { Ionicons } from '@expo/vector-icons';


export default function NavBar({navigationRef,active}){


    const btnStyle = (name) => (active === name ? styles.navButtonSelected : styles.navButton);
    const iconColor = (name) => (active === name ? "white" : "#2a2a2aff");


    return(
        <View style={styles.container}>
            <Pressable style={btnStyle("Dashboard")} onPress={() => navigationRef.navigate("Dashboard")}>
                <Ionicons name="radio-outline" size={24} color={iconColor("Dashboard")} />
            </Pressable>

            <Pressable style={btnStyle("SearchPage")} onPress={() => navigationRef.navigate("SearchPage")}>
                <Ionicons name="search-outline" size={24} color={iconColor("SearchPage")} />
            </Pressable>

            <Pressable style={btnStyle("LogPage")} onPress={() => navigationRef.navigate("LogPage")}>
                <Ionicons name="document-text-outline" size={24} color={iconColor("LogPage")} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({

    container:{
  
    
        backgroundColor: "white",
        flexDirection:"row",
        borderRadius: 24,
        paddingVertical: 4,
        paddingHorizontal:4,
    
        alignSelf:"center",

    },

    navButton:{
        borderRadius: 24,
        paddingVertical: 8,
        padding: 8,
        marginHorizontal: 8,
 
    },

    navButtonSelected:{
        backgroundColor: "#FE751A",
        borderRadius: 24,
        padding: 8,
        marginHorizontal: 8,
   
    },



});