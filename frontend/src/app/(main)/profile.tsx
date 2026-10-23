import { Text, StyleSheet, View } from 'react-native';
import { AppNav } from '../../components/AppNav';
export default function Profile(){
    return(
        <AppBackground style={styles.container}>
            <View style={styles.heading}>
                <ScreenHeading>
                    <Text style={styles.text}>Dexter Gamayot @ da back</Text>
                </ScreenHeading>
            </View>

            <View style={styles.bottomNav}>
            <AppNav />
            </View>
        </AppBackground>

        
    );
}

const styles = StyleSheet.create({
    heading: { padding: 22 },
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
import { ScreenHeading } from '../../components/ScreenHeading';
import { AppBackground } from '../../components/AppBackground';
