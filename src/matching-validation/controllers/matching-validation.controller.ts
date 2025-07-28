import { Controller, Post, HttpStatus, HttpException } from "@nestjs/common"
import type { MatchingValidationService } from "../services/matching-validation.service"
import type { ValidationTestCase, ValidationReport } from "../interfaces/validation.interface"

@Controller("validate")
export class MatchingValidationController {
  constructor(private readonly matchingValidationService: MatchingValidationService) {}

  /**
   * Triggers a validation run for the matching logic.
   * @param testCases An array of test cases to run.
   * @returns A comprehensive validation report.
   */
  @Post("run")
  async runValidation(testCases: ValidationTestCase[]): Promise<ValidationReport> {
    if (!testCases || testCases.length === 0) {
      throw new HttpException("No test cases provided for validation.", HttpStatus.BAD_REQUEST)
    }
    try {
      return await this.matchingValidationService.runValidation(testCases)
    } catch (error) {
      throw new HttpException(`Validation failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
