import React, { useState ,ReactNode}  from "react";
import { LinearGradient } from "expo-linear-gradient";

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
  }) => {
  if (variant === "primary") {
    // Gradient wrapper for primary
    return (
      <TouchableOpacity onPress={onPress} style={styles.btnWrapper}>
        <LinearGradient
          colors={["#8783f0ff","#2e27bbff", "#6366F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.btn, styles.btnPrimary]}
        >
          <Text style={[styles.btnText, styles.btnText]}>
            {title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Non-gradient buttons
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.btn,
        variant === "secondary" && styles.btnIndigo,
        variant === "ghost" && styles.btnGhost,
      ]}
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
};
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <View style={styles.heroWrap}>
        <Text style={styles.title}>Creating Your Budget</Text>
        <Text style={styles.subtitle}>Step {step} of 4</Text>
      </View>
        <View style={styles.headerNav}>
  {step > 1 && (
    <TouchableOpacity onPress={prevStep} style={styles.backArrow}>
      <Ionicons name="chevron-back" size={24} color="#111827" />
    </TouchableOpacity>
  )}
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
  </>
)}
{step === 4 && (
  <>
    <Text style={styles.subtitle}>Set Your Financial Goals</Text>

    {/* Goals Slider */}
  <Text style={styles.label}>Goal allocation</Text>
<View style={styles.goalButtonsContainer}>
  {["Saving", "Mid", "Spending"].map((goalOption) => {
    const selected = formData.goals === goalOption;
    return (
      <TouchableOpacity
        key={goalOption}
        style={[styles.goalButton, selected && styles.goalButtonSelected]}
        onPress={() => setFormData({ ...formData, goals: goalOption })}
      >
        <Text
          style={[styles.goalButtonText, selected && styles.goalButtonTextSelected]}
        >
          {goalOption}
        </Text>
      </TouchableOpacity>
    );
  })}
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
  </>
)}
                       {/* <Text style={styles.confirmBox}>
                {JSON.stringify(formData, null, 2)}
                </Text> */}       
    {step === 5 && (
            <StyledButton
              title="Confirm"
              variant="primary"
              onPress={() => alert("Submitted")}
            />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ===== Layout =====
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB", // light cosmic base
  },
  scroll: {
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },

  // ===== Hero / Headers =====
  heroWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 6,
    textAlign: "center",
  },
headerNav: {
  position: "absolute",
  top: 50, // adjust depending on your padding
  left: 20,
  zIndex: 10,
},
backArrow: {
  padding: 6, // gives touch area without a bulky button
  borderRadius: 20,
  backgroundColor: "rgba(0,0,0,0.04)", // faint circle background
},
  // ===== Card =====
  card: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.08)", // soft indigo border
    shadowColor: "#4F46E5",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  // ===== Inputs =====
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 52,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },

  // ===== Labels =====
  container: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#fff",
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.15)",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  rangeText: {
    textAlign: "center",
    marginVertical: 8,
    fontSize: 16,
    color: "#374151",
  },

  // ===== Buttons =====
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 12,
  },
    btnWrapper: {
    marginVertical: 8,
    borderRadius: 14,
    overflow: "hidden", // ensures gradient corners are rounded
  },
  btnPrimary: {
    backgroundColor: "linear-gradient(90deg, #4F46E5, #6366F1)", // handled with expo-linear-gradient wrapper
    shadowColor: "#4F46E5",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  btnIndigo: {
    backgroundColor: "#bdbef7ff",
    shadowColor: "#6366F1",
    color: "#494cf5ff",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
btnGhost: {
  backgroundColor: "transparent",
  borderWidth: 1.2,
  borderColor: "#D1D5DB", // soft neutral grey (Tailwind's gray-300)
},

btnGhostText: {
  color: "#374151", // dark neutral grey (Tailwind's gray-700)
  fontWeight: "600",
},

  // ===== Goals =====
  goalButtonsContainer: {
  flexDirection: "row",
  backgroundColor: "#E5E7EB", // light grey background
  borderRadius: 999,
  padding: 4,
  marginTop: 12,
},

goalButton: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 10,
  borderRadius: 999,
},

goalButtonSelected: {
  backgroundColor: "#fff",
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
  color: "#111827", // gray-900
},


  // ===== Priorities =====
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginVertical: 6,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  optionSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  optionText: {
    color: "#111827",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },

  // ===== Confirm Box (debug) =====
  confirmBox: {
    backgroundColor: "#F3F4F6",
    color: "#111827",
    fontSize: 14,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
});
