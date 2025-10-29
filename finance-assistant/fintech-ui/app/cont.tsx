import React, { useMemo, useState, ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ImageBackground,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ViewStyle,
  ImageBackgroundProps,
} from "react-native";
import { Colors } from "@/constants/theme";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import styles from "./contStyle";
// Set this to false to disable the hero image temporarily during development
const USE_HERO_IMAGE = false; // Change this to true when hero.jpg is available

// Styles that will be used by both View and ImageBackground
const containerStyles = StyleSheet.create({
  base: {
    flex: 1,
    width: "100%",
    height: "100%",
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  solid: {
    backgroundColor: Colors.light.background,
  },
});

type BackgroundContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
} & Partial<ImageBackgroundProps>;

const BackgroundContainer: React.FC<BackgroundContainerProps> = ({ children, style, ...props }) => {
    return (
      <ImageBackground
        source={require("../assets/images/marm.jpg")}
        style={[containerStyles.base, style]}
        resizeMode="cover"
        {...props}
      >
        {children}
      </ImageBackground>
    );
};

type Spending = { rent: number; utilities: number; transportation: number; other: number };
type Income = { from: number; to: number };
type FormData = {
  finances: string;
  income: Income;
  lifeSituation: string;
  spending: Spending;
  goals: "Saving" | "Mid" | "Spending";
  priorities: string[];
};

type ButtonVariant = "primary" | "secondary" | "ghost";
type StyledButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  testID?: string;
  disabled?: boolean;
};

export default function MultiStepForm() {
  const [step, setStep] = useState<number>(1);
  const [cardWidth, setCardWidth] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    finances: "",
    income: { from: 1000, to: 2000 },
    lifeSituation: "",
    spending: { rent: 0, utilities: 0, transportation: 0, other: 0 },
    goals: "Saving",
    priorities: [],
  });

  // inline error messages per step
  const [errors, setErrors] = useState<Record<string, string>>({});

  const spendingOptions: { key: keyof Spending; label: string }[] = [
    { key: "rent", label: "Rent" },
    { key: "utilities", label: "Utilities" },
    { key: "transportation", label: "Transportation" },
    { key: "other", label: "Other bills" },
  ];

  const handleIncomeChange = (values: number[]) => {
    setFormData((prev) => ({ ...prev, income: { from: values[0], to: values[1] } }));
  };

  const nextStep = () => setStep((p) => Math.min(4, p + 1));
  const prevStep = () => setStep((p) => Math.max(1, p - 1));

  // ------- validation that returns error messages (no alerts) -------
  const getStepErrors = (s: number, data: FormData) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!data.finances.trim()) e.finances = "Please enter your finances.";
      const { from, to } = data.income;
      if (from <= 0 || to <= 0 || from >= to) e.income = "Please select a valid income range.";
    }
    if (s === 2) {
      if (!data.lifeSituation) e.lifeSituation = "Please select your life situation.";
    }
    if (s === 3) {
      const anyFilled = Object.values(data.spending).some((v) => Number(v) > 0);
      if (!anyFilled) e.spending = "Please fill in at least one spending field.";
    }
    if (s === 4) {
      if (!data.goals) e.goals = "Please select a financial goal.";
      if (data.priorities.length === 0) e.priorities = "Please select at least one priority.";
    }
    return e;
  };

  const stepErrors = useMemo(() => getStepErrors(step, formData), [step, formData]);

  const handleNext = async () => {
    if (submitting) return;
    const currentErrors = getStepErrors(step, formData);
    if (Object.keys(currentErrors).length) {
      setErrors(currentErrors); // show errors inline
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      if (step === 4) {
        Alert.alert("Success", "Your budget has been created!");
        router.replace("/(tabs)");
        return;
      }
      nextStep();
    } finally {
      setSubmitting(false);
    }
  };

  const StyledButton: React.FC<StyledButtonProps> = ({
    title,
    onPress,
    variant = "primary",
    icon,
    testID,
    disabled,
  }) => (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && console.log(`[BUTTON] onPressIn: ${title}`)}
      onPressOut={() => !disabled && console.log(`[BUTTON] onPressOut: ${title}`)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnIndigo,
        variant === "ghost" && styles.btnGhost,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text style={[styles.btnText, variant === "ghost" && styles.btnGhostText]}>{title}</Text>
    </Pressable>
  );

  // We're using BackgroundContainer instead of this renderContent
  return (
    <BackgroundContainer
      style={{
        width: "100%",
        height: "100%",
        paddingTop: 80,
        paddingHorizontal: 30,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1 }} pointerEvents="box-none">
            {step > 1 && (
              <Pressable
                style={styles.backButton}
                onPress={prevStep}
                hitSlop={12}
                pointerEvents="auto"
              >
                <Text
                  style={{
                    position: "absolute",
                    left: 20,
                    top: 1,
                    color: "#90a3ecff",
                    fontSize: 30,
                  }}
                >
                  {"<"}
                </Text>
              </Pressable>
            )}

            <View style={styles.heroWrap} pointerEvents="box-none">
              <Text style={styles.title}>Creating Your Budget</Text>
              <Text style={styles.subtitle}>Step {step} of 4</Text>
            </View>

            <View
              style={styles.card}
              pointerEvents="auto"
              onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            >
              {/* STEP 1 */}
              {step === 1 && (
                <>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      placeholder="Finances"
                      placeholderTextColor="#8b8b8bff"
                      value={formData.finances}
                      onChangeText={(text) => setFormData({ ...formData, finances: text })}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  </View>
                  {errors.finances || stepErrors.finances ? (
                    <Text style={styles.errText}>{errors.finances || stepErrors.finances}</Text>
                  ) : null}

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
                      sliderLength={Math.max(cardWidth - 80, 160)}
                      trackStyle={{ height: 12, borderRadius: 6 }}
                      markerStyle={{
                        height: 20,
                        width: 20,
                        borderRadius: 15,
                        backgroundColor: "#4b56f3ff",
                        top: 6,
                      }}
                    />
                  </View>
                  {errors.income || stepErrors.income ? (
                    <Text style={[styles.errText, { marginTop: 6 }]}>
                      {errors.income || stepErrors.income}
                    </Text>
                  ) : null}

                  <StyledButton testID="next-1" title="Next" onPress={handleNext} disabled={!!submitting} />
                </>
              )}

              {/* STEP 2 */}
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
                      onPress={() => setFormData({ ...formData, lifeSituation: option.label })}
                    />
                  ))}
                  {errors.lifeSituation || stepErrors.lifeSituation ? (
                    <Text style={styles.errText}>
                      {errors.lifeSituation || stepErrors.lifeSituation}
                    </Text>
                  ) : null}

                  <StyledButton testID="next-2" title="Next" onPress={handleNext} disabled={!!submitting} />
                </>
              )}

              {/* STEP 3 */}
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
                            ? ""
                            : String(formData.spending[option.key])
                        }
                        onChangeText={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            spending: {
                              ...prev.spending,
                              [option.key]: Number(val) || 0,
                            },
                          }))
                        }
                        returnKeyType="done"
                      />
                    </View>
                  ))}
                  {errors.spending || stepErrors.spending ? (
                    <Text style={styles.errText}>{errors.spending || stepErrors.spending}</Text>
                  ) : null}

                  <StyledButton testID="next-3" title="Next" onPress={handleNext} disabled={!!submitting} />
                </>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <>
                  <Text style={styles.subtitle}>Set Your Financial Goals</Text>

                  <Text style={styles.label}>Goal allocation</Text>
                  <View style={styles.goalButtonsContainer}>
                    {["Saving", "Mid", "Spending"].map((goalOption) => (
                      <Pressable
                        key={goalOption}
                        style={[
                          styles.goalButton,
                          formData.goals === goalOption && styles.goalButtonSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, goals: goalOption as any })}
                        hitSlop={8}
                      >
                        <Text
                          style={[
                            styles.goalButtonText,
                            formData.goals === goalOption && styles.goalButtonTextSelected,
                          ]}
                        >
                          {goalOption}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {errors.goals || stepErrors.goals ? (
                    <Text style={styles.errText}>{errors.goals || stepErrors.goals}</Text>
                  ) : null}

                  <Text style={styles.subtitle}>Select Your Priorities</Text>
                  {["Entertainment", "Clothes", "Food", "Travelling", "Others"].map((option) => {
                    const selected = formData.priorities.includes(option);
                    return (
                      <Pressable
                        key={option}
                        style={[styles.optionButton, selected && styles.optionSelected]}
                        onPress={() => {
                          const newPriorities = selected
                            ? formData.priorities.filter((p) => p !== option)
                            : [...formData.priorities, option];
                          setFormData({ ...formData, priorities: newPriorities });
                        }}
                        hitSlop={8}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {errors.priorities || stepErrors.priorities ? (
                    <Text style={styles.errText}>{errors.priorities || stepErrors.priorities}</Text>
                  ) : null}

                  <StyledButton
                    testID="confirm"
                    title="Confirm"
                    variant="primary"
                    onPress={handleNext}
                    disabled={!!submitting}
                  />
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundContainer>
  );
}


