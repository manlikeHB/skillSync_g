# Mentor-Mentee Matching Data Specification

## Overview

This document defines the essential data points required for effective mentor-mentee matching in the SkillSync platform. It specifies required fields, data structures, validation rules, and input requirements for the matching algorithm.

## Core Data Points

### 1. User Profile Data

#### Required Fields for All Users

```typescript
interface BaseUserProfile {
  id: string;                    // UUID - Unique identifier
  email: string;                 // Email address (unique)
  name: string;                  // Full name
  role: UserRole;               // MENTOR | MENTEE | ADMIN
  bio: string;                  // Personal description (max 500 chars)
  createdAt: Date;              // Account creation date
  updatedAt: Date;              // Last profile update
  isActive: boolean;            // Account status
  reputationScore: number;      // Community reputation (0-5 scale)
}
```

#### Mentor-Specific Required Fields

```typescript
interface MentorProfile extends BaseUserProfile {
  // Professional Information
  skills: Skill[];              // Array of skills with proficiency levels
  expertiseAreas: string[];     // Primary areas of expertise
  experienceYears: number;      // Years of professional experience
  industry: string;             // Primary industry
  company: string;              // Current company (optional)
  title: string;                // Professional title
  
  // Credentials & Verification
  credentialFile: string;       // File path to credentials
  isVerified: boolean;          // Credential verification status
  certifications: Certification[]; // Professional certifications
  
  // Availability & Preferences
  availability: AvailabilitySchedule;
  maxMentees: number;          // Maximum mentees they can handle
  preferredMeetingFormat: MeetingFormat[]; // Video, in-person, etc.
  hourlyRate?: number;         // Optional hourly rate
  
  // Mentoring Style
  mentoringStyle: MentoringStyle;
  communicationPreferences: CommunicationPreference[];
}
```

#### Mentee-Specific Required Fields

```typescript
interface MenteeProfile extends BaseUserProfile {
  // Learning Goals
  learningGoals: LearningGoal[]; // Specific learning objectives
  targetSkills: Skill[];        // Skills they want to develop
  experienceLevel: ExperienceLevel; // Beginner, Intermediate, Advanced
  
  // Background
  currentRole?: string;         // Current job title (if employed)
  industry?: string;            // Target industry
  educationLevel: EducationLevel;
  
  // Preferences
  preferredMentorCharacteristics: MentorCharacteristic[];
  availability: AvailabilitySchedule;
  budget?: number;              // Monthly budget for mentoring
  preferredMeetingFormat: MeetingFormat[];
}
```

### 2. Skills & Expertise Data Structure

```typescript
interface Skill {
  name: string;                 // Skill name (e.g., "JavaScript")
  category: SkillCategory;      // Programming, Design, Business, etc.
  proficiencyLevel: ProficiencyLevel; // For mentors: EXPERT, ADVANCED, INTERMEDIATE
  yearsOfExperience?: number;   // Years using this skill
  certifications?: string[];    // Related certifications
  projects?: Project[];         // Portfolio projects
}

enum SkillCategory {
  PROGRAMMING = 'programming',
  DESIGN = 'design',
  BUSINESS = 'business',
  MARKETING = 'marketing',
  DATA_SCIENCE = 'data_science',
  PRODUCT_MANAGEMENT = 'product_management',
  SOFT_SKILLS = 'soft_skills',
  OTHER = 'other'
}

enum ProficiencyLevel {
  BEGINNER = 'beginner',        // 0-1 years
  INTERMEDIATE = 'intermediate', // 1-3 years
  ADVANCED = 'advanced',        // 3-7 years
  EXPERT = 'expert'             // 7+ years
}
```

### 3. Learning Goals & Objectives

```typescript
interface LearningGoal {
  id: string;
  title: string;               // Goal title
  description: string;         // Detailed description
  category: GoalCategory;      // Career, Skill, Project, etc.
  priority: Priority;          // HIGH, MEDIUM, LOW
  timeline: Timeline;          // 1-3 months, 3-6 months, 6+ months
  successMetrics: string[];    // How success will be measured
  isActive: boolean;           // Currently pursuing
  createdAt: Date;
  targetCompletionDate?: Date;
}

enum GoalCategory {
  CAREER_ADVANCEMENT = 'career_advancement',
  SKILL_DEVELOPMENT = 'skill_development',
  PROJECT_COMPLETION = 'project_completion',
  NETWORKING = 'networking',
  INDUSTRY_TRANSITION = 'industry_transition',
  LEADERSHIP = 'leadership'
}

enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

enum Timeline {
  SHORT_TERM = '1-3_months',
  MEDIUM_TERM = '3-6_months',
  LONG_TERM = '6+_months'
}
```

### 4. Availability & Scheduling

```typescript
interface AvailabilitySchedule {
  timezone: string;            // IANA timezone identifier
  weeklyAvailability: WeeklyAvailability[];
  preferredMeetingDuration: number; // Minutes (30, 60, 90)
  maxMeetingsPerWeek: number;  // Maximum meetings per week
  blackoutDates: Date[];       // Dates when unavailable
}

interface WeeklyAvailability {
  dayOfWeek: DayOfWeek;       // MONDAY, TUESDAY, etc.
  timeSlots: TimeSlot[];       // Available time slots
}

interface TimeSlot {
  startTime: string;           // HH:MM format
  endTime: string;             // HH:MM format
  isAvailable: boolean;
}

enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}
```

### 5. Mentoring Preferences & Style

```typescript
interface MentoringStyle {
  approach: MentoringApproach; // STRUCTURED, FLEXIBLE, HANDS_ON
  communicationStyle: CommunicationStyle; // DIRECT, SUPPORTIVE, CHALLENGING
  feedbackStyle: FeedbackStyle; // CONSTRUCTIVE, ENCOURAGING, DIRECT
  preferredInteractionFrequency: InteractionFrequency;
}

enum MentoringApproach {
  STRUCTURED = 'structured',     // Formal curriculum
  FLEXIBLE = 'flexible',         // Adaptive to needs
  HANDS_ON = 'hands_on',        // Project-based
  THEORETICAL = 'theoretical'    // Concept-focused
}

enum CommunicationStyle {
  DIRECT = 'direct',            // Straightforward
  SUPPORTIVE = 'supportive',    // Encouraging
  CHALLENGING = 'challenging',  // Pushes boundaries
  COLLABORATIVE = 'collaborative' // Partnership approach
}

enum FeedbackStyle {
  CONSTRUCTIVE = 'constructive',
  ENCOURAGING = 'encouraging',
  DIRECT = 'direct',
  SANDWICH = 'sandwich'         // Positive-negative-positive
}

enum InteractionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  AS_NEEDED = 'as_needed'
}
```

### 6. Demographic & Background Information

```typescript
interface DemographicInfo {
  age?: number;                // Age range or specific age
  gender?: Gender;             // Self-identified gender
  ethnicity?: string[];        // Ethnic background
  location: Location;          // Geographic location
  educationLevel: EducationLevel;
  languages: string[];         // Languages spoken
  disabilities?: string[];     // Accessibility needs
}

interface Location {
  country: string;
  state?: string;
  city?: string;
  timezone: string;
  coordinates?: { lat: number; lng: number };
}

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

enum EducationLevel {
  HIGH_SCHOOL = 'high_school',
  ASSOCIATE = 'associate',
  BACHELOR = 'bachelor',
  MASTER = 'master',
  DOCTORATE = 'doctorate',
  OTHER = 'other'
}
```

### 7. Matching Preferences & Constraints

```typescript
interface MatchingPreferences {
  // Skill Matching
  requiredSkills: string[];    // Must-have skills
  preferredSkills: string[];   // Nice-to-have skills
  skillProficiencyLevel: ProficiencyLevel; // Minimum required level
  
  // Experience Matching
  minExperienceYears?: number; // Minimum years of experience
  maxExperienceYears?: number; // Maximum years of experience
  industryPreference?: string[]; // Preferred industries
  
  // Personal Preferences
  genderPreference?: Gender[]; // Gender preferences
  ageRange?: { min: number; max: number };
  locationPreference?: LocationPreference;
  
  // Communication Preferences
  communicationStylePreference?: CommunicationStyle[];
  meetingFormatPreference?: MeetingFormat[];
  
  // Availability Requirements
  requiredAvailability: AvailabilityRequirement;
  
  // Budget Constraints
  maxBudget?: number;          // Maximum monthly budget
  pricingPreference?: PricingModel; // FREE, PAID, BOTH
}

enum LocationPreference {
  LOCAL = 'local',             // Same city/region
  REMOTE = 'remote',           // Virtual only
  HYBRID = 'hybrid',           // Both local and remote
  ANY = 'any'                  // No preference
}

enum MeetingFormat {
  VIDEO_CALL = 'video_call',
  PHONE_CALL = 'phone_call',
  IN_PERSON = 'in_person',
  TEXT_CHAT = 'text_chat',
  EMAIL = 'email'
}

enum PricingModel {
  FREE = 'free',
  PAID = 'paid',
  BOTH = 'both'
}
```

## Data Validation Rules

### Required Field Validation

```typescript
// All users must have:
- Valid email format
- Name (2-50 characters)
- Role (MENTOR, MENTEE, ADMIN)
- At least one skill
- Availability schedule
- Timezone

// Mentors must have:
- At least 2 years of experience
- Credential file uploaded
- Expertise areas defined
- Mentoring style preferences

// Mentees must have:
- At least one learning goal
- Experience level defined
- Target skills specified
```

### Data Quality Rules

```typescript
// Skills validation:
- Skill names must be standardized (use predefined skill taxonomy)
- Proficiency levels must be appropriate for experience years
- Maximum 20 skills per user

// Availability validation:
- Time slots must be valid (start < end)
- No overlapping time slots
- At least 2 hours of availability per week

// Learning goals validation:
- Goals must be specific and measurable
- Maximum 5 active goals per mentee
- Goals must have realistic timelines
```

## Input Data Structures for Matching Algorithm

### 1. Matching Request

```typescript
interface MatchingRequest {
  userId: string;
  userType: 'mentor' | 'mentee';
  preferences: MatchingPreferences;
  filters: MatchingFilters;
  limit: number;               // Number of matches to return
  algorithm: string;           // Algorithm to use
}

interface MatchingFilters {
  minScore: number;           // Minimum compatibility score
  maxDistance?: number;       // Maximum geographic distance
  availabilityOverlap: number; // Minimum availability overlap
  skillMatchThreshold: number; // Minimum skill match percentage
}
```

### 2. Matching Response

```typescript
interface MatchingResponse {
  matches: MatchResult[];
  totalProcessed: number;
  executionTime: number;
  algorithm: string;
}

interface MatchResult {
  targetUserId: string;
  score: number;              // Overall compatibility score (0-1)
  confidence: number;         // Confidence in the match (0-1)
  breakdown: ScoreBreakdown;  // Detailed scoring breakdown
  reasons: string[];          // Human-readable match reasons
  metadata: MatchMetadata;
}

interface ScoreBreakdown {
  skillMatch: number;         // Skills compatibility score
  experienceMatch: number;    // Experience level compatibility
  availabilityMatch: number;  // Schedule compatibility
  preferenceMatch: number;    // Preference alignment
  demographicMatch: number;   // Demographic compatibility
  reputationScore: number;    // Reputation consideration
}

interface MatchMetadata {
  algorithm: string;
  dataQuality: number;        // Quality of input data
  lastUpdated: Date;
  matchHistory?: MatchHistory[];
}
```

## Implementation Guidelines

### 1. Data Collection Strategy

```typescript
// Phase 1: Essential Information
- Basic profile (name, email, role)
- Skills and experience
- Availability schedule
- Learning goals (mentees)

// Phase 2: Detailed Preferences
- Mentoring style preferences
- Communication preferences
- Geographic and demographic info
- Budget constraints

// Phase 3: Advanced Features
- Portfolio projects
- Certifications
- References
- Success metrics
```

### 2. Data Storage Considerations

```typescript
// Database Schema:
- Use JSONB for flexible preference storage
- Index on frequently queried fields (skills, location, availability)
- Implement soft deletes for data retention
- Use separate tables for complex relationships

// Caching Strategy:
- Cache user profiles for 24 hours
- Cache matching results for 1 hour
- Use Redis for session and temporary data
```

### 3. Privacy & Security

```typescript
// Data Protection:
- Encrypt sensitive personal information
- Implement data retention policies
- Provide data export/deletion options
- Anonymize data for analytics

// Access Control:
- Role-based access to user data
- Audit logging for data access
- Consent management for data sharing
```

## API Endpoints for Data Management

### Profile Management

```typescript
// Create/Update Profile
POST /api/users/profile
PUT /api/users/profile/:id

// Get Profile
GET /api/users/profile/:id
GET /api/users/profile/me

// Skills Management
POST /api/users/:id/skills
DELETE /api/users/:id/skills/:skillId

// Availability Management
PUT /api/users/:id/availability
GET /api/users/:id/availability
```

### Matching Requests

```typescript
// Request Matches
POST /api/matching/request
GET /api/matching/request/:requestId

// Get Match Results
GET /api/matching/results/:userId
GET /api/matching/history/:userId
```

## Success Metrics

### Data Quality Metrics

```typescript
interface DataQualityMetrics {
  completeness: number;        // Percentage of required fields filled
  accuracy: number;           // Data validation pass rate
  consistency: number;        // Cross-field consistency
  freshness: number;          // Data update frequency
}
```

### Matching Quality Metrics

```typescript
interface MatchingQualityMetrics {
  matchAccuracy: number;      // User satisfaction with matches
  responseRate: number;       // Percentage of matches that respond
  meetingCompletion: number;  // Percentage of scheduled meetings completed
  longTermSuccess: number;    // Matches lasting 3+ months
}
```

## Conclusion

This specification provides a comprehensive framework for collecting and managing the essential data points needed for effective mentor-mentee matching. The structured approach ensures data quality, enables sophisticated matching algorithms, and supports continuous improvement of the matching system.

The implementation should be phased to allow for gradual adoption and validation of the data collection process while maintaining system performance and user experience. 