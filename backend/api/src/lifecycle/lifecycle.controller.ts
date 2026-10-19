import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { LifecycleService } from './lifecycle.service.js';
import type {
  CreateEvaluationDto,
  CreateMaintenanceRecordDto,
  CreateTestRecordDto,
  MaintenanceType,
  TestResult,
  TestType,
  UpdateEvaluationDto,
  UpdateMaintenanceRecordDto,
  UpdateTestRecordDto,
  UploadTechnicalDocumentDto,
  UpsertAnalysisDto,
  UpsertDesignDto,
  UpsertImplementationDto,
  UpsertProjectPlanDto,
} from './lifecycle.types.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('applications/:id/lifecycle')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'TECHNICIAN')
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  // ------------------------------------------------------------
  // OVERVIEW
  // ------------------------------------------------------------
  @Get()
  async getOverview(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const data = await this.lifecycleService.getLifecycleOverview(id, req.user);
    return { data };
  }

  // ------------------------------------------------------------
  // 1. ANALYSIS
  // ------------------------------------------------------------
  @Get('analysis')
  async getAnalysis(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const data = await this.lifecycleService.getAnalysis(id, req.user);
    return { data };
  }

  @Put('analysis')
  async upsertAnalysis(
    @Param('id') id: string,
    @Body() body: UpsertAnalysisDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.upsertAnalysis(id, body, req.user);
    return { data };
  }

  // ------------------------------------------------------------
  // 2. PLANNING (Project Plan)
  // ------------------------------------------------------------
  @Get('planning')
  async getPlanning(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const data = await this.lifecycleService.getProjectPlan(id, req.user);
    return { data };
  }

  @Put('planning')
  async upsertPlanning(
    @Param('id') id: string,
    @Body() body: UpsertProjectPlanDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.upsertProjectPlan(id, body, req.user);
    return { data };
  }

  // ------------------------------------------------------------
  // 3. DESIGN
  // ------------------------------------------------------------
  @Get('design')
  async getDesign(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const data = await this.lifecycleService.getDesign(id, req.user);
    return { data };
  }

  @Put('design')
  async upsertDesign(
    @Param('id') id: string,
    @Body() body: UpsertDesignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.upsertDesign(id, body, req.user);
    return { data };
  }

  // ------------------------------------------------------------
  // 4. IMPLEMENTATION
  // ------------------------------------------------------------
  @Get('implementation')
  async getImplementation(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const data = await this.lifecycleService.getImplementation(id, req.user);
    return { data };
  }

  @Put('implementation')
  async upsertImplementation(
    @Param('id') id: string,
    @Body() body: UpsertImplementationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.upsertImplementation(id, body, req.user);
    return { data };
  }

  // ------------------------------------------------------------
  // 5. TESTING
  // ------------------------------------------------------------
  @Get('tests')
  async getTests(
    @Param('id') id: string,
    @Query('type') type: TestType | undefined,
    @Query('result') result: TestResult | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getTests(id, req.user, { type, result });
    return { data };
  }

  @Get('tests/:testId')
  async getTest(
    @Param('id') id: string,
    @Param('testId') testId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getTest(id, testId, req.user);
    return { data };
  }

  @Post('tests')
  async createTest(
    @Param('id') id: string,
    @Body() body: CreateTestRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.createTest(id, body, req.user);
    return { data };
  }

  @Put('tests/:testId')
  async updateTest(
    @Param('id') id: string,
    @Param('testId') testId: string,
    @Body() body: UpdateTestRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.updateTest(id, testId, body, req.user);
    return { data };
  }

  @Get('tests/:testId/attachment')
  async getTestAttachment(
    @Param('id') id: string,
    @Param('testId') testId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getTestAttachmentUrl(id, testId, req.user);
    return { data };
  }

  @Delete('tests/:testId')
  async deleteTest(
    @Param('id') id: string,
    @Param('testId') testId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.lifecycleService.deleteTest(id, testId, req.user);
    return { data: { success: true } };
  }

  // ------------------------------------------------------------
  // 6. MAINTENANCE
  // ------------------------------------------------------------
  @Get('maintenance')
  async getMaintenance(
    @Param('id') id: string,
    @Query('type') type: MaintenanceType | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getMaintenanceRecords(id, req.user, { type });
    return { data };
  }

  @Get('maintenance/:recordId')
  async getMaintenanceRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getMaintenanceRecord(id, recordId, req.user);
    return { data };
  }

  @Post('maintenance')
  async createMaintenance(
    @Param('id') id: string,
    @Body() body: CreateMaintenanceRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.createMaintenanceRecord(id, body, req.user);
    return { data };
  }

  @Put('maintenance/:recordId')
  async updateMaintenance(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @Body() body: UpdateMaintenanceRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.updateMaintenanceRecord(id, recordId, body, req.user);
    return { data };
  }

  @Get('maintenance/:recordId/attachment')
  async getMaintenanceAttachment(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getMaintenanceAttachmentUrl(id, recordId, req.user);
    return { data };
  }

  @Delete('maintenance/:recordId')
  async deleteMaintenance(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.lifecycleService.deleteMaintenanceRecord(id, recordId, req.user);
    return { data: { success: true } };
  }

  // ------------------------------------------------------------
  // 7. EVALUATION
  // ------------------------------------------------------------
  @Get('evaluations')
  async getEvaluations(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const data = await this.lifecycleService.getEvaluations(id, req.user);
    return { data };
  }

  @Get('evaluations/:evalId')
  async getEvaluation(
    @Param('id') id: string,
    @Param('evalId') evalId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getEvaluation(id, evalId, req.user);
    return { data };
  }

  @Post('evaluations')
  async createEvaluation(
    @Param('id') id: string,
    @Body() body: CreateEvaluationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.createEvaluation(id, body, req.user);
    return { data };
  }

  @Put('evaluations/:evalId')
  async updateEvaluation(
    @Param('id') id: string,
    @Param('evalId') evalId: string,
    @Body() body: UpdateEvaluationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.updateEvaluation(id, evalId, body, req.user);
    return { data };
  }

  @Get('evaluations/:evalId/attachment')
  async getEvaluationAttachment(
    @Param('id') id: string,
    @Param('evalId') evalId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getEvaluationAttachmentUrl(id, evalId, req.user);
    return { data };
  }

  @Delete('evaluations/:evalId')
  async deleteEvaluation(
    @Param('id') id: string,
    @Param('evalId') evalId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.lifecycleService.deleteEvaluation(id, evalId, req.user);
    return { data: { success: true } };
  }

  // ------------------------------------------------------------
  // 8. TECHNICAL DOCUMENTS
  // ------------------------------------------------------------
  @Get('technical-documents')
  async getTechnicalDocuments(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const data = await this.lifecycleService.getTechnicalDocuments(id, req.user);
    return { data };
  }

  @Post('technical-documents')
  async uploadTechnicalDocument(
    @Param('id') id: string,
    @Body() body: UploadTechnicalDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.uploadTechnicalDocument(id, body, req.user);
    return { data };
  }

  @Get('technical-documents/:docId/download')
  async downloadTechnicalDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.lifecycleService.getTechnicalDocumentDownloadUrl(id, docId, req.user);
    return { data };
  }

  @Delete('technical-documents/:docId')
  async deleteTechnicalDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.lifecycleService.deleteTechnicalDocument(id, docId, req.user);
    return { data: { success: true } };
  }
}

