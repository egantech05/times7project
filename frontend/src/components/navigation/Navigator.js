import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Dashboard from "../../pages/dashboard";
import LogPage from "../../pages/logs";
import SearchPage from "../../pages/search"

const Stack = createNativeStackNavigator();

export default function Navigator(){

    return(

    <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false, contentStyle:{backgroundColor:"#212121"} }} >
    
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="LogPage" component={LogPage} />
        <Stack.Screen name="SearchPage" component={SearchPage} />

    </Stack.Navigator>
    );

};