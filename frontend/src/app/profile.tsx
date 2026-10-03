import { Text, StyleSheet, View } from 'react-native';
import { AppNav } from '../components/AppNav';
export default function Profile(){
    return(
        <View style={styles.container}>
            <Text style={styles.text}>Dexter Gamayot @ da back</Text>

            <View style={styles.bottomNav}>
            <AppNav />
            </View>
        </View>

        
    );
}

const styles = StyleSheet.create({
    container: {
    flex: 1,
    alignContent: 'center',
    },

    text: { 
        
        color: '#00ff00',
        fontSize: 30,
        textAlign: 'center',
        backgroundColor: 'black',
       
    },

    bottomNav: {
        marginTop: 'auto',
    }

    })
