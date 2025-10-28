import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  screen: { flex: 1, width: "100%", backgroundColor: "transparent" },
  heroWrap: { alignItems: "center", marginTop: 30 },
  backButton: { position: "absolute", top: 50, left: 0, padding: 16, zIndex: 10 },
  heroBadge: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.1)", alignItems: "center", marginBottom: 12 },
  heroBadgeText: { color: "#2563eb", fontWeight: "600" },
  title: { fontWeight: "800", color: "#0f172a", textAlign: "center" },
  subtitle: { color: "#475569", textAlign: "center", marginTop: 4 },
  container: { alignItems: "center" },
  btn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, width: "100%", marginTop: 10 },
  btnPrimary: { backgroundColor: "#3b6df6", shadowColor: "#3b82f6", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnIndigo: { backgroundColor: "#2563eb", shadowColor: "#2563eb", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnGoogle: { backgroundColor: "#ffffff", marginBottom: 30 },
  btnText: { color: "#fff", fontSize: 16, textAlign: "center", fontWeight: "700" },
  btnTextDark: { color: "#1e293b" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 1, gap: 8 },
  divider: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { color: "#ffffff", fontSize: 14 },
  loadingOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#bfdbfe" },
  smallText: { paddingTop: 10, fontSize: 15, color: "#5278b9ff", textAlign: "center" },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "rgba(59,130,246,0.25)", paddingHorizontal: 12, borderRadius: 14, marginBottom: 12 },
  input: { flex: 1, color: "#0f172a", fontSize: 16 },
  inputs: {marginBottom: 300},
  loginInputs: {marginBottom: 350}
});

export default styles;