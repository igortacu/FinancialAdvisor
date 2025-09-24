import React, { useState ,ReactNode}  from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
 Dimensions,
 
} from "react-native";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { Ionicons } from "@expo/vector-icons";

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
  name: string;
  phone: string;
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
    name: "",
    phone: "",      
    finances: "",
    income: {
        from: 1000,
        to: 2000
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

  const handleIncomeChange = (values: number[]) => {
    // values[0] = from, values[1] = to
    setFormData({ ...formData, income: { from: values[0], to: values[1] } });
  };
  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

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
        style={[
          styles.btnText,
          variant === "ghost" && styles.btnGhostText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <View style={styles.heroWrap}>
        <Text style={styles.title}>Creating Your Budget</Text>
        <Text style={styles.subtitle}>Step {step} of 4</Text>
      </View>

      <View style={styles.card}>
        {step === 1 && (
            <>
                {/* Name */}
                <View style={styles.inputWrap}>
                <TextInput
                    style={styles.input}
                    placeholder="Name Surname"
                    placeholderTextColor="#94a3b8"
                    value={formData.name}
                    onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                    }
                />
                </View>

                {/* Phone */}
                <View style={styles.inputWrap}>
                <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                    }
                />
                </View>

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
                        sliderLength={380}
                        trackStyle={{ height: 12, borderRadius: 6 }} // ↑ taller track
                        markerStyle={{
                        height: 20,
                        width: 20,
                        borderRadius: 15,
                        backgroundColor: "#4b56f3ff",
                        top: 6
                        }}
                    />
                </View>

                <StyledButton title="Next" onPress={nextStep} />
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
        variant={formData.lifeSituation === option.label ? "secondary" : "ghost"}
        icon={<Ionicons name={option.icon as any} size={20} color="black" />}
        onPress={() =>
          setFormData({ ...formData, lifeSituation: option.label })
        }
      />
    ))}

    <StyledButton title="Next" onPress={nextStep} />
    <StyledButton title="Back" variant="secondary" onPress={prevStep} />
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
    <StyledButton title="Next" onPress={nextStep} />
    <StyledButton title="Back" variant="ghost" onPress={prevStep} />
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
      onPress={() => setFormData({ ...formData, goals: goalOption })}
    >
      <Text
        style={[
          styles.goalButtonText,
          formData.goals === goalOption && styles.goalButtonTextSelected,
        ]}
      >
        {goalOption}
      </Text>
    </TouchableOpacity>
  ))}
</View>
<Text style={styles.rangeText}>Current: {formData.goals}</Text>

    {/* Priorities Multi-choice */}
    <Text style={styles.subtitle}>Select Your Priorities</Text>
    {["Entertainment", "Clothes", "Food", "Travelling", "Others"].map(
      (option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.optionButton,
            formData.priorities.includes(option) && styles.optionSelected,
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
              formData.priorities.includes(option) && styles.optionTextSelected,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      )
    )}

    {/* Navigation */}
    <StyledButton title="Next" onPress={nextStep} />
    <StyledButton title="Back" variant="ghost" onPress={prevStep} />
  </>
)}
                       {/* <Text style={styles.confirmBox}>
                {JSON.stringify(formData, null, 2)}
                </Text> */}       
    {step === 5 && (
          <>

            <StyledButton
              title="Confirm"
              variant="primary"
              onPress={() => alert("Submitted")}
            />
            <StyledButton title="Back" variant="ghost" onPress={prevStep} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff", // pure white background
  },
  scroll: {
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
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
  sliderLabel: {
    fontSize: 14,
    color: "#374151", // softer gray for subtext
    textAlign: "center",
    marginTop: 10,
  },
  heroWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
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
  confirmBox: {
    color: "#111827",
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: "#f3f4f6", // subtle light gray for contrast
    padding: 10,
    borderRadius: 10,
  },
// Goals
goalButtonsContainer: { flexDirection: "row", justifyContent: "space-between", marginVertical: 10 },
goalButton: {
  flex: 1,
  padding: 12,
  marginHorizontal: 5,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#ccc",
  alignItems: "center",
  backgroundColor: "#fff",
},
goalButtonSelected: {
  backgroundColor: "#4f46e5",
  borderColor: "#4f46e5",
},
goalButtonText: { color: "#000", fontWeight: "600" },
goalButtonTextSelected: { color: "#fff" },

// Priorities
  rangeText: { textAlign: "center", marginVertical: 5, fontSize: 16 },
optionButton: {
  padding: 10,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#ccc",
  marginVertical: 5,
  alignItems: "center",
},
optionSelected: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
optionText: { color: "#000" },
optionTextSelected: { color: "#fff" },
});

