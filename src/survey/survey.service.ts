import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SurveyStatus } from 'generated/prisma/client';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { PrismaService } from 'src/db/prisma.service';
import { CreateSurveyInput } from './dto/create-survey.input';
import { FiltersSurveyInput } from './dto/filters.arg';
import { SubmitSurveyResponseInput } from './dto/submit-survey.input';
import { UpdateSurveyInput } from './dto/update-survey.input';

const SURVEY_INCLUDE = {
  questions: {
    orderBy: { order: Prisma.SortOrder.asc },
    include: {
      options: { orderBy: { order: Prisma.SortOrder.asc } },
    },
  },
  _count: { select: { responses: true } },
} satisfies Prisma.SurveyInclude;

@Injectable()
export class SurveyService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(createSurveyInput: CreateSurveyInput, adminUserId?: string) {
    const { questions, ...surveyData } = createSurveyInput;

    const survey = await this.prismaService.survey.create({
      data: {
        ...surveyData,
        ...(questions?.length && {
          questions: {
            create: questions.map((q, index) => ({
              text: q.text,
              type: q.type,
              isRequired: q.isRequired ?? true,
              order: q.order ?? index,
              scaleMin: q.scaleMin,
              scaleMax: q.scaleMax,
              scaleMinLabel: q.scaleMinLabel,
              scaleMaxLabel: q.scaleMaxLabel,
              ...(q.options?.length && {
                options: {
                  create: q.options.map((o, oIndex) => ({
                    text: o.text,
                    order: o.order ?? oIndex,
                  })),
                },
              }),
            })),
          },
        }),
      },
      include: SURVEY_INCLUDE,
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'survey',
      entityId: String(survey.id),
      details: { title: survey.title } as Prisma.InputJsonValue,
    });

    return { ...survey, _count: survey._count.responses };
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sort: string = 'createdAt-desc',
    search?: string,
    filters?: FiltersSurveyInput,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }
    const [field, order] = sort.split('-');
    const orderBy: Prisma.SurveyOrderByWithRelationInput = {
      [field]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };

    const where: Prisma.SurveyWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(filters?.status && { status: filters.status }),
    };

    const [surveys, total] = await this.prismaService.$transaction([
      this.prismaService.survey.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: SURVEY_INCLUDE,
      }),
      this.prismaService.survey.count({ where }),
    ]);

    return {
      surveys: surveys.map((s) => ({ ...s, _count: s._count.responses })),
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: number) {
    const survey = await this.prismaService.survey.findUnique({
      where: { id },
      include: SURVEY_INCLUDE,
    });
    if (!survey) throw new BadRequestException('Encuesta no encontrada');
    return { ...survey, _count: survey._count.responses };
  }

  async update(updateSurveyInput: UpdateSurveyInput, adminUserId?: string) {
    const { id, questions, ...surveyData } = updateSurveyInput;
    await this.findOne(id);

    return this.prismaService.$transaction(async (tx) => {
      await tx.survey.update({
        where: { id },
        data: surveyData,
      });

      if (questions !== undefined) {
        // Delete questions that are not in the update (removed by user)
        const existingQuestionIds = questions
          .filter((q) => q.id)
          .map((q) => q.id!);

        await tx.surveyQuestion.deleteMany({
          where: {
            surveyId: id,
            ...(existingQuestionIds.length && {
              id: { notIn: existingQuestionIds },
            }),
          },
        });

        for (const [index, q] of questions.entries()) {
          if (q.id) {
            // Update existing question
            await tx.surveyQuestion.update({
              where: { id: q.id },
              data: {
                text: q.text,
                type: q.type,
                isRequired: q.isRequired,
                order: q.order ?? index,
                scaleMin: q.scaleMin,
                scaleMax: q.scaleMax,
                scaleMinLabel: q.scaleMinLabel,
                scaleMaxLabel: q.scaleMaxLabel,
              },
            });

            if (q.options !== undefined) {
              const existingOptionIds = q.options
                .filter((o) => o.id)
                .map((o) => o.id!);

              await tx.surveyOption.deleteMany({
                where: {
                  questionId: q.id,
                  ...(existingOptionIds.length && {
                    id: { notIn: existingOptionIds },
                  }),
                },
              });

              for (const [oIndex, o] of q.options.entries()) {
                if (o.id) {
                  await tx.surveyOption.update({
                    where: { id: o.id },
                    data: { text: o.text, order: o.order ?? oIndex },
                  });
                } else {
                  await tx.surveyOption.create({
                    data: {
                      questionId: q.id,
                      text: o.text,
                      order: o.order ?? oIndex,
                    },
                  });
                }
              }
            }
          } else {
            // Create new question
            await tx.surveyQuestion.create({
              data: {
                surveyId: id,
                text: q.text,
                type: q.type,
                isRequired: q.isRequired ?? true,
                order: q.order ?? index,
                scaleMin: q.scaleMin,
                scaleMax: q.scaleMax,
                scaleMinLabel: q.scaleMinLabel,
                scaleMaxLabel: q.scaleMaxLabel,
                ...(q.options?.length && {
                  options: {
                    create: q.options.map((o, oIndex) => ({
                      text: o.text,
                      order: o.order ?? oIndex,
                    })),
                  },
                }),
              },
            });
          }
        }
      }

      const updated = await tx.survey.findUnique({
        where: { id },
        include: SURVEY_INCLUDE,
      });

      await this.auditLog.log(
        {
          userId: adminUserId,
          action: 'UPDATE',
          entity: 'survey',
          entityId: String(id),
          details: surveyData as unknown as Prisma.InputJsonValue,
        },
        tx,
      );

      return { ...updated!, _count: updated!._count.responses };
    });
  }

  async remove(ids: number[], adminUserId?: string) {
    const found = await this.prismaService.survey.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Una o más encuestas no encontradas');
    }

    await this.prismaService.survey.deleteMany({
      where: { id: { in: ids } },
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'DELETE',
      entity: 'survey',
      details: { ids } as Prisma.InputJsonValue,
    });

    return true;
  }

  async changeStatus(
    ids: number[],
    status: SurveyStatus,
    adminUserId?: string,
  ) {
    await this.prismaService.survey.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'survey',
      details: { ids, status } as Prisma.InputJsonValue,
    });

    return true;
  }

  async submitResponse(input: SubmitSurveyResponseInput, userId?: string) {
    const survey = await this.prismaService.survey.findUnique({
      where: { id: input.surveyId },
      include: { questions: { include: { options: true } } },
    });

    if (!survey) throw new BadRequestException('Encuesta no encontrada');
    if (survey.status !== SurveyStatus.ACTIVE) {
      throw new BadRequestException('La encuesta no está activa');
    }
    if (survey.endDate && survey.endDate < new Date()) {
      throw new BadRequestException('La encuesta ha finalizado');
    }
    if (survey.startDate && survey.startDate > new Date()) {
      throw new BadRequestException('La encuesta aún no ha iniciado');
    }

    // Check if user already responded (if not anonymous and not allowMultiple)
    if (!survey.isAnonymous && !survey.allowMultiple && userId) {
      const existing = await this.prismaService.surveyResponse.findFirst({
        where: { surveyId: input.surveyId, userId },
      });
      if (existing) {
        throw new BadRequestException('Ya has respondido esta encuesta');
      }
    }

    // Validate required questions
    const requiredQuestionIds = survey.questions
      .filter((q) => q.isRequired)
      .map((q) => q.id);

    const answeredQuestionIds = input.answers.map((a) => a.questionId);
    const missingRequired = requiredQuestionIds.filter(
      (qId) => !answeredQuestionIds.includes(qId),
    );

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        'Faltan respuestas a preguntas obligatorias',
      );
    }

    const response = await this.prismaService.surveyResponse.create({
      data: {
        surveyId: input.surveyId,
        userId: survey.isAnonymous ? null : userId,
        answers: {
          create: input.answers.map((a) => ({
            questionId: a.questionId,
            optionId: a.optionId,
            textValue: a.textValue,
            scaleValue: a.scaleValue,
          })),
        },
      },
      include: { answers: true },
    });

    return response;
  }

  async getResults(surveyId: number) {
    const survey = await this.prismaService.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: { orderBy: { order: 'asc' } },
            answers: true,
          },
        },
        _count: { select: { responses: true } },
      },
    });

    if (!survey) throw new BadRequestException('Encuesta no encontrada');

    const questionResults = survey.questions.map((question) => {
      const totalAnswers = question.answers.length;

      const result: {
        questionId: number;
        text: string;
        type: string;
        totalAnswers: number;
        optionResults?: {
          optionId: number;
          text: string;
          count: number;
          percentage: number;
        }[];
        textResponses?: string[];
        scaleAverage?: number;
      } = {
        questionId: question.id,
        text: question.text,
        type: question.type,
        totalAnswers,
      };

      if (
        question.type === 'SINGLE_CHOICE' ||
        question.type === 'MULTIPLE_CHOICE'
      ) {
        result.optionResults = question.options.map((option) => {
          const count = question.answers.filter(
            (a) => a.optionId === option.id,
          ).length;
          return {
            optionId: option.id,
            text: option.text,
            count,
            percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0,
          };
        });
      }

      if (question.type === 'TEXT') {
        result.textResponses = question.answers
          .filter((a) => a.textValue)
          .map((a) => a.textValue!);
      }

      if (question.type === 'SCALE') {
        const scaleValues = question.answers
          .filter((a) => a.scaleValue !== null)
          .map((a) => a.scaleValue!);
        result.scaleAverage =
          scaleValues.length > 0
            ? scaleValues.reduce((sum, v) => sum + v, 0) / scaleValues.length
            : undefined;
      }

      return result;
    });

    return {
      surveyId: survey.id,
      title: survey.title,
      totalResponses: survey._count.responses,
      questionResults,
    };
  }

  async getActiveSurveys() {
    const now = new Date();
    return this.prismaService.survey.findMany({
      where: {
        status: SurveyStatus.ACTIVE,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: { orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePublic(id: number) {
    const survey = await this.prismaService.survey.findUnique({
      where: { id, status: SurveyStatus.ACTIVE },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!survey) throw new BadRequestException('Encuesta no encontrada');
    return survey;
  }
}
