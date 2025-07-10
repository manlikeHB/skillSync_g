import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/user/recommend-mentors (GET)', async () => {
    // Replace 'mentee-uuid' with a valid mentee ID in your test DB
    const menteeId = 'mentee-uuid';
    const n = 3;
    const res = await request(app.getHttpServer())
      .get(`/user/recommend-mentors?menteeId=${menteeId}&n=${n}`)
      .expect(200);
    expect(res.body).toHaveProperty('recommendations');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(res.body.recommendations.length).toBeLessThanOrEqual(n);
  });
});
