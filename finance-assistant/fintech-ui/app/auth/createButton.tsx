import {Text, ActivityIndicator, TouchableOpacity, StyleSheet} from "react-native"
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles";

type CreateButtonProps = {
    isLoading: boolean;
    handleRegister: () => void;
};

export default function createButton({isLoading, handleRegister}: CreateButtonProps){
    
    
    return(
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleRegister} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : 
        (<>
        <Ionicons name="checkmark-circle" size={18} color="#fff" />
        <Text style={styles.btnText}>Create account</Text>
        </>
        )}
        </TouchableOpacity>
    )

}
