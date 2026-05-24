import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { SunatSenderService } from './sunat-sender.service';

describe('SunatSenderService', () => {
  let service: SunatSenderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SunatSenderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SunatSenderService>(SunatSenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
