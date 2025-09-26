import React, { useState, ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from "react-native";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { router } from "expo-router";
type Spending = {
  rent: number;
  utilities: number;
  transportation: number;
  other: number;
};
type Income = {
  from: number;
  to: number;
};

type FormData = {
  finances: string;
  income: Income;
  lifeSituation: string;
  spending: Spending;
  goals: string;
  priorities: string[];
};

type ButtonVariant = "primary" | "secondary" | "ghost";

type StyledButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export default function MultiStepForm() {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>({
    finances: "",
    income: {
      from: 1000,
      to: 2000,
    },
    lifeSituation: "",
    spending: {
      rent: 0,
      utilities: 0,
      transportation: 0,
      other: 0,
    },
    goals: "Saving",
    priorities: [],
  });

  const spendingOptions: { key: keyof Spending; label: string }[] = [
    { key: "rent", label: "Rent" },
    { key: "utilities", label: "Utilities" },
    { key: "transportation", label: "Transportation" },
    { key: "other", label: "Other bills" },
  ];
  const [cardWidth, setCardWidth] = useState(0);
  const handleIncomeChange = (values: number[]) => {
    // values[0] = from, values[1] = to
    setFormData({ ...formData, income: { from: values[0], to: values[1] } });
  };
  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);


const validateStep = () => {
  if (step === 1) {
    if (!formData.finances.trim()) {
      Alert.alert("Required", "Please enter your finances.");
      return false;
    }
    if (formData.income.from <= 0 && formData.income.to <= 0) {
      Alert.alert("Required", "Please select your income range.");
      return false;
    }
  }

  if (step === 2) {
    if (!formData.lifeSituation) {
      Alert.alert("Required", "Please select your life situation.");
      return false;
    }
  }

  if (step === 3) {
    const allFilled = Object.values(formData.spending).some((val) => val > 0);
    if (!allFilled) {
      Alert.alert("Required", "Please fill in at least one spending field.");
      return false;
    }
  }

  if (step === 4) {
    if (!formData.goals) {
      Alert.alert("Required", "Please select a financial goal.");
      return false;
    }
    if (formData.priorities.length === 0) {
      Alert.alert("Required", "Please select at least one priority.");
      return false;
    }
  }

  return true;
};

  const handleNext = () => {
 if (!validateStep()) return;

  if (step === 4) {
    // Last step → navigate
    Alert.alert("Success", "Your budget has been created!");
    router.replace("/(tabs)"); // navigate to the correct page
  } else {
    // Not the last step → go to next
    nextStep();
  }
  };


  const StyledButton: React.FC<StyledButtonProps> = ({
    title,
    onPress,
    variant = "primary",
  }) => (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnIndigo,
        variant === "ghost" && styles.btnGhost,
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.btnText, variant === "ghost" && styles.btnGhostText]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
        <ImageBackground
          source={require('../assets/images/hero.jpg')}
          style={{ width: '100%', height: '100%', paddingTop: 80, paddingHorizontal: 30 }}
          >
             {step > 1 && (
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={prevStep}
                    >
                      <Text style={{position: 'absolute', left: 20, top: 1, color: '#90a3ecff', fontSize: 30}}>{'<'}</Text>
                    </TouchableOpacity>
             )}
      <View style={styles.heroWrap}>
        <Text style={styles.title}>Creating Your Budget</Text>
        <Text style={styles.subtitle}>Step {step} of 4</Text>
      </View>

      <View style={styles.card}
       onLayout={(event) => {
    const { width } = event.nativeEvent.layout;
    setCardWidth(width); // store it in state
  }}>
        {step === 1 && (
          <>
            {/* Name */}

            {/* Finances */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Finances"
                placeholderTextColor="#1f1f1fff"
                value={formData.finances}
                onChangeText={(text) =>
                  setFormData({ ...formData, finances: text })
                }
              />
            </View>

            {/* Income Slider */}
            <View style={styles.container}>
              <Text style={styles.label}>
                Income range: ${formData.income.from.toLocaleString()} - $
                {formData.income.to.toLocaleString()}
              </Text>

              <MultiSlider
                values={[formData.income.from, formData.income.to]}
                min={0}
                max={10000}
                step={100}
                onValuesChange={handleIncomeChange}
                selectedStyle={{ backgroundColor: "#4b56f3ff" }}
                unselectedStyle={{ backgroundColor: "#e9eaffff" }}
                containerStyle={{ marginVertical: 20 }}
                sliderLength={cardWidth - 80}
                trackStyle={{ height: 12, borderRadius: 6 }} // ↑ taller track
                markerStyle={{
                  height: 20,
                  width: 20,
                  borderRadius: 15,
                  backgroundColor: "#4b56f3ff",
                  top: 6,
                }}
              />
            </View>

            <StyledButton title="Next" onPress={handleNext} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.subtitle}>Life Situation</Text>

            {[
              { label: "Student", icon: "school-outline" },
              { label: "Employed", icon: "briefcase-outline" },
              { label: "Self-Employed", icon: "business-outline" },
              { label: "Unemployed", icon: "close-circle-outline" },
              { label: "Retired", icon: "walk-outline" },
              { label: "Other", icon: "help-circle-outline" },
            ].map((option) => (
              <StyledButton
                key={option.label}
                title={option.label}
                variant={
                  formData.lifeSituation === option.label
                    ? "secondary"
                    : "ghost"
                }
                icon={
                  <Ionicons name={option.icon as any} size={20} color="black" />
                }
                onPress={() =>
                  setFormData({ ...formData, lifeSituation: option.label })
                }
              />
            ))}

            <StyledButton title="Next" onPress={handleNext} />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.subtitle}>Monthly Spending</Text>
            {spendingOptions.map((option) => (
              <View style={styles.inputWrap} key={option.key}>
                <TextInput
                  style={styles.input}
                  placeholder={option.label}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={
                    formData.spending[option.key] === 0
                      ? "" // show empty input for 0
                      : formData.spending[option.key].toString()
                  }
                  onChangeText={(val) =>
                    setFormData({
                      ...formData,
                      spending: {
                        ...formData.spending,
                        [option.key]: Number(val) || 0, // dynamically update correct field
                      },
                    })
                  }
                />
              </View>
            ))}
            {/* Navigation */}
            <StyledButton title="Next" onPress={handleNext} />
          </>
        )}
        {step === 4 && (
          <>
            <Text style={styles.subtitle}>Set Your Financial Goals</Text>

            {/* Goals Slider */}
            <Text style={styles.label}>Goal allocation</Text>
            <View style={styles.goalButtonsContainer}>
              {["Saving", "Mid", "Spending"].map((goalOption) => (
                <TouchableOpacity
                  key={goalOption}
                  style={[
                    styles.goalButton,
                    formData.goals === goalOption && styles.goalButtonSelected,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, goals: goalOption })
                  }
                >
                  <Text
                    style={[
                      styles.goalButtonText,
                      formData.goals === goalOption &&
                        styles.goalButtonTextSelected,
                    ]}
                  >
                    {goalOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Priorities Multi-choice */}
            <Text style={styles.subtitle}>Select Your Priorities</Text>
            {["Entertainment", "Clothes", "Food", "Travelling", "Others"].map(
              (option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    formData.priorities.includes(option) &&
                      styles.optionSelected,
                  ]}
                  onPress={() => {
                    const newPriorities = formData.priorities.includes(option)
                      ? formData.priorities.filter((p) => p !== option)
                      : [...formData.priorities, option];
                    setFormData({ ...formData, priorities: newPriorities });
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.priorities.includes(option) &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ),
            )}

            {/* Navigation */}
            <StyledButton title="Confirm" variant="primary" onPress={handleNext} />
          </>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 20,
    backgroundColor: "#ffffff", // white card look
    borderRadius: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)", // subtle border
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827", // dark text for contrast
    textAlign: "center",
    marginBottom: 12,
  },
  heroWrap: {
    marginTop: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827", // bold dark title
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280", // lighter gray for subtitle
    marginTop: 5,
    textAlign: "center",
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginTop: 50,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb", // light input background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 50,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "rgba(15, 14, 14, 1)",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  btnPrimary: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#4f46e5",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  btnIndigo: {
    backgroundColor: "#6366f1",
    shadowColor: "#6366f1",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  btnGhostText: {
    color: "#6366f1",
  },
    backButton: {
    position: "absolute",
    top: 20, // adjust for safe area / status bar
    left: 15,
    backgroundColor: "rgba(255, 255, 255, 0)", // subtle transparent background,
    padding: 10,
  },
goalButtonsContainer: {
  flexDirection: "row",
  marginBottom: 20,
  backgroundColor: "#E5E7EB", // light grey (Tailwind gray-200)
  borderRadius: 12, // fully rounded
  padding: 4,
},

goalButton: {
  flex: 1, // makes each option equal width
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 8,
  borderRadius: 9,
},

goalButtonSelected: {
  backgroundColor: "#fff", // white highlight
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2,
  elevation: 1,
},
goalButtonText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#374151", // gray-700
},

goalButtonTextSelected: {
  color: "#111827", // gray-900 for stronger contrast
},

  // Priorities
  rangeText: { textAlign: "center", marginVertical: 5, fontSize: 16 },
  optionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    marginVertical: 5,
    alignItems: "center",
  },
  optionSelected: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  optionText: { color: "#000" },
  optionTextSelected: { color: "#fff" },
});
