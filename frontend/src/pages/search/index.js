import { ActivityIndicator, StyleSheet, Text, View} from "react-native";
import SearchBar from "../../components/searchBar";
import { SearchResults } from "../../components/searchResults";

export default function SearchPage(){

    return(
        <View style={styles.container}>
            <SearchBar/>
            <View><Text style={styles.notFound}>Item not found</Text></View>  
            <SearchResults/>
        
        </View>   
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding:16,
        gap:8,
      },

      notFound:{
        color: "grey",
        alignSelf: "center",
        marginVertical:16,
      },
    
});