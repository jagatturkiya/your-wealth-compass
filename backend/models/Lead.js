const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  email:           { type: String, default: "" },
  mobile:          { type: String, default: "" },
  age:             { type: String, default: "" },
  income:          { type: String, default: "0" },
  expenses:        { type: String, default: "0" },
  savings:         { type: String, default: "0" },
  city:            { type: String, default: "" },
  retirementAge:   { type: String, default: "60" },
  termInsurance:   { type: String, default: "no" },
  termAmount:      { type: String, default: "0" },
  healthInsurance: { type: String, default: "no" },
  healthAmount:    { type: String, default: "0" },
  goals:           { type: Array, default: [] },
  healthScore:     { type: Number, default: 0 },
  totalMonthlyRequired: { type: Number, default: 0 },
  emergencyGap:    { type: Number, default: 0 },
  scores:          { type: Object, default: {} },
  protection:      { type: Object, default: {} },
  pdfUrl:          { type: String, default: null },
  userId:          { type: String, default: "", index: true },
  referralCode:    { type: String, default: "", index: true },
  sourceAdvisor: {
    advisorId:          { type: String, default: "" },
    advisorName:        { type: String, default: "" },
    advisorDesignation: { type: String, default: "Certified Financial Advisor" },
    referralCode:       { type: String, default: "" }
  },
  assignedTo: {
    advisorId:          { type: String, default: null, index: true },
    advisorName:        { type: String, default: "" },
    advisorEmail:       { type: String, default: "" },
    advisorDesignation: { type: String, default: "Certified Financial Advisor" },
    assignedAt:         { type: Date, default: null }
  },
  leadStatus: {
    type: String,
    enum: ["new", "contacted", "in_discussion", "meeting_scheduled", "converted", "lost", "archived"],
    default: "new",
    index: true
  },
  advisorNotes: [
    {
      id: { type: String, default: () => "note_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6) },
      note: { type: String, default: "" },
      authorName: { type: String, default: "Advisor" },
      authorRole: { type: String, default: "advisor" },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model("Lead", leadSchema);
