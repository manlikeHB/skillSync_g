// Core Data Interfaces for Mentor-Mentee Matching

export interface BaseUserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  bio: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  reputationScore: number;
}

export interface MentorProfile extends BaseUserProfile {
  // Professional Information
  skills: Skill[];
  expertiseAreas: string[];
  experienceYears: number;
  industry: string;
  company?: string;
  title: string;
  
  // Credentials & Verification
  credentialFile: string;
  isVerified: boolean;
  certifications: Certification[];
  
  // Availability & Preferences
  availability: AvailabilitySchedule;
  maxMentees: number;
  preferredMeetingFormat: MeetingFormat[];
  hourlyRate?: number;
  
  // Mentoring Style
  mentoringStyle: MentoringStyle;
  communicationPreferences: CommunicationPreference[];
}

export interface MenteeProfile extends BaseUserProfile {
  // Learning Goals
  learningGoals: LearningGoal[];
  targetSkills: Skill[];
  experienceLevel: ExperienceLevel;
  
  // Background
  currentRole?: string;
  industry?: string;
  educationLevel: EducationLevel;
  
  // Preferences
  preferredMentorCharacteristics: MentorCharacteristic[];
  availability: AvailabilitySchedule;
  budget?: number;
  preferredMeetingFormat: MeetingFormat[];
}

// Skills & Expertise
export interface Skill {
  name: string;
  category: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  certifications?: string[];
  projects?: Project[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  completedAt?: Date;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
}

// Learning Goals
export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: Priority;
  timeline: Timeline;
  successMetrics: string[];
  isActive: boolean;
  createdAt: Date;
  targetCompletionDate?: Date;
}

// Availability & Scheduling
export interface AvailabilitySchedule {
  timezone: string;
  weeklyAvailability: WeeklyAvailability[];
  preferredMeetingDuration: number;
  maxMeetingsPerWeek: number;
  blackoutDates: Date[];
}

export interface WeeklyAvailability {
  dayOfWeek: DayOfWeek;
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// Mentoring Preferences & Style
export interface MentoringStyle {
  approach: MentoringApproach;
  communicationStyle: CommunicationStyle;
  feedbackStyle: FeedbackStyle;
  preferredInteractionFrequency: InteractionFrequency;
}

export interface CommunicationPreference {
  type: CommunicationType;
  frequency: InteractionFrequency;
  preferredTime: string;
}

// Demographic & Background
export interface DemographicInfo {
  age?: number;
  gender?: Gender;
  ethnicity?: string[];
  location: Location;
  educationLevel: EducationLevel;
  languages: string[];
  disabilities?: string[];
}

export interface Location {
  country: string;
  state?: string;
  city?: string;
  timezone: string;
  coordinates?: { lat: number; lng: number };
}

// Matching Preferences & Constraints
export interface MatchingPreferences {
  // Skill Matching
  requiredSkills: string[];
  preferredSkills: string[];
  skillProficiencyLevel: ProficiencyLevel;
  
  // Experience Matching
  minExperienceYears?: number;
  maxExperienceYears?: number;
  industryPreference?: string[];
  
  // Personal Preferences
  genderPreference?: Gender[];
  ageRange?: { min: number; max: number };
  locationPreference?: LocationPreference;
  
  // Communication Preferences
  communicationStylePreference?: CommunicationStyle[];
  meetingFormatPreference?: MeetingFormat[];
  
  // Availability Requirements
  requiredAvailability: AvailabilityRequirement;
  
  // Budget Constraints
  maxBudget?: number;
  pricingPreference?: PricingModel;
}

export interface AvailabilityRequirement {
  minHoursPerWeek: number;
  preferredDays: DayOfWeek[];
  preferredTimeSlots: TimeSlot[];
  timezone: string;
}

export interface MentorCharacteristic {
  trait: string;
  importance: number; // 1-5 scale
  description?: string;
}

// Matching Algorithm Interfaces
export interface MatchingRequest {
  userId: string;
  userType: 'mentor' | 'mentee';
  preferences: MatchingPreferences;
  filters: MatchingFilters;
  limit: number;
  algorithm: string;
}

export interface MatchingFilters {
  minScore: number;
  maxDistance?: number;
  availabilityOverlap: number;
  skillMatchThreshold: number;
}

export interface MatchingResponse {
  matches: MatchResult[];
  totalProcessed: number;
  executionTime: number;
  algorithm: string;
}

export interface MatchResult {
  targetUserId: string;
  score: number;
  confidence: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  metadata: MatchMetadata;
}

export interface ScoreBreakdown {
  skillMatch: number;
  experienceMatch: number;
  availabilityMatch: number;
  preferenceMatch: number;
  demographicMatch: number;
  reputationScore: number;
}

export interface MatchMetadata {
  algorithm: string;
  dataQuality: number;
  lastUpdated: Date;
  matchHistory?: MatchHistory[];
}

export interface MatchHistory {
  matchId: string;
  date: Date;
  score: number;
  outcome: MatchOutcome;
}

// Enums
export enum UserRole {
  MENTOR = 'mentor',
  MENTEE = 'mentee',
  ADMIN = 'admin',
}

export enum SkillCategory {
  PROGRAMMING = 'programming',
  DESIGN = 'design',
  BUSINESS = 'business',
  MARKETING = 'marketing',
  DATA_SCIENCE = 'data_science',
  PRODUCT_MANAGEMENT = 'product_management',
  SOFT_SKILLS = 'soft_skills',
  OTHER = 'other',
}

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum GoalCategory {
  CAREER_ADVANCEMENT = 'career_advancement',
  SKILL_DEVELOPMENT = 'skill_development',
  PROJECT_COMPLETION = 'project_completion',
  NETWORKING = 'networking',
  INDUSTRY_TRANSITION = 'industry_transition',
  LEADERSHIP = 'leadership',
}

export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum Timeline {
  SHORT_TERM = '1-3_months',
  MEDIUM_TERM = '3-6_months',
  LONG_TERM = '6+_months',
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum MentoringApproach {
  STRUCTURED = 'structured',
  FLEXIBLE = 'flexible',
  HANDS_ON = 'hands_on',
  THEORETICAL = 'theoretical',
}

export enum CommunicationStyle {
  DIRECT = 'direct',
  SUPPORTIVE = 'supportive',
  CHALLENGING = 'challenging',
  COLLABORATIVE = 'collaborative',
}

export enum FeedbackStyle {
  CONSTRUCTIVE = 'constructive',
  ENCOURAGING = 'encouraging',
  DIRECT = 'direct',
  SANDWICH = 'sandwich',
}

export enum InteractionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  AS_NEEDED = 'as_needed',
}

export enum CommunicationType {
  VIDEO_CALL = 'video_call',
  PHONE_CALL = 'phone_call',
  TEXT_CHAT = 'text_chat',
  EMAIL = 'email',
  IN_PERSON = 'in_person',
}

export enum MeetingFormat {
  VIDEO_CALL = 'video_call',
  PHONE_CALL = 'phone_call',
  IN_PERSON = 'in_person',
  TEXT_CHAT = 'text_chat',
  EMAIL = 'email',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum EducationLevel {
  HIGH_SCHOOL = 'high_school',
  ASSOCIATE = 'associate',
  BACHELOR = 'bachelor',
  MASTER = 'master',
  DOCTORATE = 'doctorate',
  OTHER = 'other',
}

export enum LocationPreference {
  LOCAL = 'local',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ANY = 'any',
}

export enum PricingModel {
  FREE = 'free',
  PAID = 'paid',
  BOTH = 'both',
}

export enum MatchOutcome {
  SUCCESSFUL = 'successful',
  UNSUCCESSFUL = 'unsuccessful',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
}

// Data Quality Metrics
export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  freshness: number;
}

export interface MatchingQualityMetrics {
  matchAccuracy: number;
  responseRate: number;
  meetingCompletion: number;
  longTermSuccess: number;
} 