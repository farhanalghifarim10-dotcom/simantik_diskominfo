import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import type {
  SubmitApplicationPayload,
  UploadedDocumentInput,
} from './applications.types.js';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async submit(@Body() body: Record<string, unknown>) {
    // Parsing payload
    const payload: SubmitApplicationPayload = {
      service_id: String(body.service_id || ''),
      opd_unit_id: String(body.opd_unit_id || ''),
      applicant_name: String(body.applicant_name || ''),
      applicant_employee_id: body.applicant_employee_id
        ? String(body.applicant_employee_id)
        : undefined,
      applicant_position: String(body.applicant_position || ''),
      applicant_email: String(body.applicant_email || ''),
      applicant_phone: String(body.applicant_phone || ''),
      title: String(body.title || ''),
      background: String(body.background || ''),
      problem_statement: String(body.problem_statement || ''),
      objective: String(body.objective || ''),
      scope: String(body.scope || ''),
      expected_output: String(body.expected_output || ''),
      requested_deadline: body.requested_deadline
        ? String(body.requested_deadline)
        : undefined,
      existing_application_name: body.existing_application_name
        ? String(body.existing_application_name)
        : undefined,
      additional_notes: body.additional_notes
        ? String(body.additional_notes)
        : undefined,
      terms_accepted: Boolean(body.terms_accepted),
      terms_version: String(body.terms_version || ''),
      idempotency_key: body.idempotency_key
        ? String(body.idempotency_key)
        : undefined,
    };

    // Parsing documents list
    const rawDocs = Array.isArray(body.documents) ? body.documents : [];
    const documents: UploadedDocumentInput[] = rawDocs.map(
      (d: Record<string, unknown>) => ({
        requirement_id: String(d.requirement_id || ''),
        original_filename: String(d.original_filename || ''),
        mime_type: String(d.mime_type || ''),
        size_bytes: Number(d.size_bytes || 0),
        buffer: d.base64_data
          ? Buffer.from(String(d.base64_data), 'base64')
          : undefined,
      }),
    );

    const data = await this.applicationsService.submitApplication(
      payload,
      documents,
    );

    return {
      success: true,
      data,
      message: 'Permohonan layanan berhasil didaftarkan.',
    };
  }
}

@Controller('opd-units')
export class OpdUnitsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  async getOpdUnits() {
    const data = await this.applicationsService.getOpdUnits();
    return {
      success: true,
      data,
    };
  }
}
