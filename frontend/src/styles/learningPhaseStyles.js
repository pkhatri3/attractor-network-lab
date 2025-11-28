export const styles = {
  pageRoot: {
    minHeight: "100vh",
    background: "#0f141a",
    color: "#eaf4ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 0",
    position: "relative",
  },

  navBtnLeft: {
    position: "absolute",
    top: 20,
    left: 20,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#1a6fd6",
    color: "#eaf4ff",
    textDecoration: "none",
    fontWeight: 600,
  },

  navBtnRight: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: "10px 12px",
    borderRadius: 12,
    color: "#eaf4ff",
    textDecoration: "none",
    fontWeight: 600,
  },

  mainContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 32,
    width: "95%",          
    maxWidth: 1400,        
  },

  panelLeft: {
    flex: 1.2,             
    background: "rgba(20,20,26,0.92)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  panelRight: {
    flex: 0.9,
    background: "rgba(20,20,26,0.92)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  textarea: {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
  color: "#eaf4ff",
  border: "1px solid rgba(255,255,255,0.12)",
  fontSize: 13,
  lineHeight: 1.4,
  boxSizing: "border-box",
},

input: {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
  color: "#eaf4ff",
  border: "1px solid rgba(255,255,255,0.12)",
  fontSize: 13,
  boxSizing: "border-box",
},


  label: {
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 4,
  },

  btnPrimary: {
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#1a6fd6",
    color: "#eaf4ff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },

  collapseBtn: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#eaf4ff",
    fontWeight: 600,
  },

  matrixPlaceholder: {
    width: 300,
    height: 300,
    border: "2px dashed rgba(255,255,255,0.2)",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.5)",
  },

  randomCountInput: {
  width: 90,
  padding: 8,
  borderRadius: 6,
  background: "transparent",
  color: "#eaf4ff",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: 13,
  boxSizing: "border-box",
},

  colorSchemeGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    justifyItems: "center",
  },

  colorSchemeCard: {
    width: "90px",
    padding: "8px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.06)",
    cursor: "pointer",
    textAlign: "center",
  },

  colorSchemePreview: {
    height: "24px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.25)",
  },

  fullscreenOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(3, 8, 20, 0.86)", 
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(3px)",
  },

  fullscreenOverlayCard: {
    background: "rgba(15, 20, 30, 0.98)",
    borderRadius: 18,
    padding: "24px 32px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
    border: "1px solid rgba(255,255,255,0.14)",
    textAlign: "center",
    minWidth: 260,
    maxWidth: 420,
  },

  fullscreenOverlayTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
    color: "#eaf4ff",
  },

  fullscreenOverlayText: {
    fontSize: 13,
    opacity: 0.85,
    color: "#eaf4ff",
    marginBottom: 14,
  },

  fullscreenOverlayMeta: {
    fontSize: 12,
    opacity: 0.7,
    color: "#c3d4f0",
  },

  colorSchemeLabel: {
    display: "block",
    marginTop: "4px",
    fontSize: "12px",
    color: "#eaf4ff",
    opacity: 0.9,
  },

  
  leftGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
    gap: 12,
    marginBottom: 12,
  },

  card: {
    borderRadius: 14,
    padding: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },

  cardTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.9,
  },

  cardSubtitle: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },

  chip: {
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(26,111,214,0.14)",
    border: "1px solid rgba(26,111,214,0.7)",
    whiteSpace: "nowrap",
  },

  fieldRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
  },

  
  sectionCard: {
    borderRadius: 14,
    padding: 14,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    marginBottom: 14,
  },

  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
  },

  sectionSubtitle: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },

  sectionPill: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(26,111,214,0.16)",
    border: "1px solid rgba(26,111,214,0.7)",
    whiteSpace: "nowrap",
  },
};
