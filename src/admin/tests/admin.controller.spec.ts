import { Test, type TestingModule } from "@nestjs/testing"
import { AdminController } from "../controllers/admin.controller"
import { AdminService } from "../services/admin.service"
import { HttpException, HttpStatus } from "@nestjs/common"
import { LogLevel, LogCategory } from "../../logging-monitoring/interfaces/log.interface"
import { jest } from "@jest/globals"

describe("AdminController", () => {
  let controller: AdminController
  let service: AdminService

  const mockAdminService = {
    getDashboardSummary: jest.fn(),
    getAllUserProfilesSummary: jest.fn(),
    getUserProfileDetails: jest.fn(),
    updateUserProfile: jest.fn(),
    deactivateUserProfile: jest.fn(),
    activateUserProfile: jest.fn(),
    getAllAiMatches: jest.fn(),
    getAllManualMatchAdjustments: jest.fn(),
    getSystemLogs: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile()

    controller = module.get<AdminController>(AdminController)
    service = module.get<AdminService>(AdminService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("getDashboardSummary", () => {
    it("should return dashboard summary", async () => {
      const summary = {
        totalUsers: 10,
        activeUsers: 8,
        totalAiMatches: 50,
        totalManualMatches: 5,
        recentErrors: [],
        recentRecommendations: [],
        systemHealth: { status: "ok", database: "connected" },
      }
      mockAdminService.getDashboardSummary.mockResolvedValue(summary)
      expect(await controller.getDashboardSummary()).toEqual(summary)
      expect(service.getDashboardSummary).toHaveBeenCalled()
    })

    it("should throw HttpException on service error", async () => {
      mockAdminService.getDashboardSummary.mockRejectedValue(new Error("Service error"))
      await expect(controller.getDashboardSummary()).rejects.toThrow(
        new HttpException("Failed to get dashboard summary: Service error", HttpStatus.INTERNAL_SERVER_ERROR),
      )
    })
  })

  describe("getAllUserProfilesSummary", () => {
    it("should return all user profiles summary", async () => {
      const profiles = [{ userId: "u1", isActive: true }]
      mockAdminService.getAllUserProfilesSummary.mockResolvedValue(profiles)
      expect(await controller.getAllUserProfilesSummary()).toEqual(profiles)
      expect(service.getAllUserProfilesSummary).toHaveBeenCalled()
    })

    it("should throw HttpException on service error", async () => {
      mockAdminService.getAllUserProfilesSummary.mockRejectedValue(new Error("Service error"))
      await expect(controller.getAllUserProfilesSummary()).rejects.toThrow(
        new HttpException("Failed to get user profiles: Service error", HttpStatus.INTERNAL_SERVER_ERROR),
      )
    })
  })

  describe("getUserProfileDetails", () => {
    it("should return user profile details", async () => {
      const profile = { userId: "u1", attributes: { age: 30 } }
      mockAdminService.getUserProfileDetails.mockResolvedValue(profile)
      expect(await controller.getUserProfileDetails("u1")).toEqual(profile)
      expect(service.getUserProfileDetails).toHaveBeenCalledWith("u1")
    })

    it("should throw HttpException on service error", async () => {
      mockAdminService.getUserProfileDetails.mockRejectedValue(new Error("Not found"))
      await expect(controller.getUserProfileDetails("u1")).rejects.toThrow(
        new HttpException("Not found", HttpStatus.NOT_FOUND),
      )
    })
  })

  describe("updateUserProfile", () => {
    const updates = { isActive: false, adminUserId: "admin1" }
    const updatedProfile = { userId: "u1", isActive: false }

    it("should update user profile", async () => {
      mockAdminService.updateUserProfile.mockResolvedValue(updatedProfile)
      expect(await controller.updateUserProfile("u1", updates, "admin1")).toEqual(updatedProfile)
      expect(service.updateUserProfile).toHaveBeenCalledWith("u1", updates, "admin1")
    })

    it("should throw HttpException if adminUserId is missing", async () => {
      await expect(controller.updateUserProfile("u1", { isActive: false }, undefined)).rejects.toThrow(
        new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST),
      )
    })

    it("should throw HttpException on service error", async () => {
      mockAdminService.updateUserProfile.mockRejectedValue(new Error("Update failed"))
      await expect(controller.updateUserProfile("u1", updates, "admin1")).rejects.toThrow(
        new HttpException("Update failed", HttpStatus.BAD_REQUEST),
      )
    })
  })

  describe("deactivateUserProfile", () => {
    const updatedProfile = { userId: "u1", isActive: false }

    it("should deactivate user profile", async () => {
      mockAdminService.deactivateUserProfile.mockResolvedValue(updatedProfile)
      expect(await controller.deactivateUserProfile("u1", "admin1")).toEqual(updatedProfile)
      expect(service.deactivateUserProfile).toHaveBeenCalledWith("u1", "admin1")
    })

    it("should throw HttpException if adminUserId is missing", async () => {
      await expect(controller.deactivateUserProfile("u1", undefined)).rejects.toThrow(
        new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST),
      )
    })
  })

  describe("activateUserProfile", () => {
    const updatedProfile = { userId: "u1", isActive: true }

    it("should activate user profile", async () => {
      mockAdminService.activateUserProfile.mockResolvedValue(updatedProfile)
      expect(await controller.activateUserProfile("u1", "admin1")).toEqual(updatedProfile)
      expect(service.activateUserProfile).toHaveBeenCalledWith("u1", "admin1")
    })

    it("should throw HttpException if adminUserId is missing", async () => {
      await expect(controller.activateUserProfile("u1", undefined)).rejects.toThrow(
        new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST),
      )
    })
  })

  describe("getAllAiMatches", () => {
    it("should return all AI matches", async () => {
      const matches = [{ id: "ai1" }]
      mockAdminService.getAllAiMatches.mockResolvedValue(matches)
      expect(await controller.getAllAiMatches()).toEqual(matches)
      expect(service.getAllAiMatches).toHaveBeenCalled()
    })

    it("should throw HttpException on service error", async () => {
      mockAdminService.getAllAiMatches.mockRejectedValue(new Error("Service error"))
      await expect(controller.getAllAiMatches()).rejects.toThrow(
        new HttpException("Failed to get AI matches: Service error", HttpStatus.INTERNAL_SERVER_ERROR),
      )
    })
  })

  describe("getAllManualMatchAdjustments", () => {
    it("should return all manual match adjustments", async () => {
      const matches = [{ id: "manual1" }]
      mockAdminService.getAllManualMatchAdjustments.mockResolvedValue(matches)
      expect(await controller.getAllManualMatchAdjustments()).toEqual(matches)
      expect(service.getAllManualMatchAdjustments).toHaveBeenCalled()
    })

    it("should throw HttpException on service error", async () => {
      mockAdminService.getAllManualMatchAdjustments.mockRejectedValue(new Error("Service error"))
      await expect(controller.getAllManualMatchAdjustments()).rejects.toThrow(
        new HttpException("Failed to get manual matches: Service error", HttpStatus.INTERNAL_SERVER_ERROR),
      )
    })
  })

  describe("getSystemLogs", () => {
    it("should return system logs", async () => {
      const logs = [{ id: "log1", level: LogLevel.INFO }]
      const filters = { level: LogLevel.INFO, category: LogCategory.SYSTEM }
      mockAdminService.getSystemLogs.mockResolvedValue(logs)
      expect(await controller.getSystemLogs(filters)).toEqual(logs)
      expect(service.getSystemLogs).toHaveBeenCalledWith(filters)
    })

    it("should throw HttpException on service error", async () => {
      mockAdminService.getSystemLogs.mockRejectedValue(new Error("Service error"))
      await expect(controller.getSystemLogs({})).rejects.toThrow(
        new HttpException("Failed to get system logs: Service error", HttpStatus.INTERNAL_SERVER_ERROR),
      )
    })
  })
})
