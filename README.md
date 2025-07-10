<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

---

# Mentor-Mentee Recommendation Algorithm Documentation

## Overview

This system provides intelligent mentor recommendations for mentees by combining state-of-the-art collaborative filtering (CF) and content-based (semantic skill matching) approaches. The hybrid algorithm leverages both historical interaction data and semantic similarity of skills, ensuring accurate, relevant, and explainable matches.

## Architecture

**Components:**
- **NestJS Backend:** Orchestrates data flow, exposes API endpoints, and combines recommendation signals.
- **Python Microservice (FastAPI):** Computes semantic similarity between mentee and mentor skills using sentence-transformers.
- **Collaborative Filtering Service (Python, e.g., LightFM):** Provides mentor recommendations based on historical interaction data.

**Data Flow:**
1. Mentee requests recommendations via the NestJS API.
2. NestJS fetches mentee and mentor profiles from the database.
3. NestJS batches all mentor skills and sends them, along with the mentee’s skills, to the Python microservice for semantic similarity scoring.
4. NestJS queries the collaborative filtering service for top mentor recommendations based on past interactions.
5. NestJS combines both signals (and optionally other features) into a hybrid score, ranks mentors, and returns the top N.

## Algorithm Details

### 1. Content-Based (Semantic Skill Matching)
- **Input:** Mentee’s skills, each mentor’s skills.
- **Process:**  
  - Both skill lists are embedded using a pre-trained sentence-transformer model.
  - The maximum cosine similarity between any mentee and mentor skill embedding is computed.
- **Output:** A semantic similarity score (0–1) for each mentor.

### 2. Collaborative Filtering
- **Input:** Mentee ID, historical mentor-mentee interaction data.
- **Process:**  
  - A collaborative filtering model (e.g., LightFM) is trained on past pairings, feedback, and ratings.
  - The model predicts the top N mentors for the given mentee.
- **Output:** A list of mentor IDs, optionally with confidence scores.

### 3. Hybrid Scoring
- **Inputs:** Semantic similarity scores, collaborative filtering results, and optional features (e.g., availability, reputation).
- **Process:**  
  - Each mentor receives a hybrid score, e.g.:
    ```
    hybridScore = 0.6 * semanticSkillScore + 0.3 * cfScore + 0.1 * (other features)
    ```
    - `semanticSkillScore`: From the Python microservice.
    - `cfScore`: 1 if mentor is in the CF top-N, else 0.
    - `other features`: e.g., availability, reputation, feedback.
  - Mentors are sorted by hybrid score.
- **Output:** Top N mentors, ranked.

## API Endpoints

### 1. NestJS Recommendation Endpoint

```
GET /user/recommend-mentors?menteeId=<mentee_id>&n=<N>
```

**Parameters:**
- `menteeId` (string): The UUID of the mentee.
- `n` (number, optional): Number of recommendations to return (default: 5).

**Response:**
```json
{
  "recommendations": [
    {
      "id": "mentor-uuid-1",
      "name": "Jane Mentor",
      "skills": ["AI", "ML", "Python"],
      "semanticSkillScore": 0.92,
      "hybridScore": 0.85,
      "availability": "available",
      "reputationScore": 4.8
    },
    ...
  ]
}
```

### 2. Python Microservice Endpoints

#### a. Batch Semantic Similarity

```
POST /batch-similarity
```
**Request Body:**
```json
{
  "mentee_skills": ["AI", "machine learning"],
  "mentors": [
    {"id": "mentor-uuid-1", "skills": ["AI", "ML", "Python"]},
    {"id": "mentor-uuid-2", "skills": ["Data Science", "Statistics"]}
  ]
}
```
**Response:**
```json
{
  "similarities": [
    {"id": "mentor-uuid-1", "similarity": 0.92},
    {"id": "mentor-uuid-2", "similarity": 0.67}
  ]
}
```

#### b. Collaborative Filtering

```
GET /recommend?mentee_id=<mentee_id>&n=<N>
```
**Response:**
```json
{
  "recommendations": ["mentor-uuid-1", "mentor-uuid-3", ...]
}
```

## Extensibility

- **Add more features:** Incorporate mentor availability, reputation, or feedback into the hybrid score.
- **Tune weights:** Adjust the hybrid score formula to optimize for your platform’s goals.
- **A/B testing:** Experiment with different algorithms and weights to maximize user satisfaction.
- **Caching:** For large mentor pools, cache or precompute similarity scores for efficiency.

## Deployment

- **Docker Compose** is recommended for orchestrating the NestJS and Python services.
- **Environment variables** should be used to configure service URLs and ports.
- **Scalability:** Both services can be scaled independently.

## Frontend Integration

- Call the `/user/recommend-mentors` endpoint to fetch recommendations.
- Display mentor cards with names, skills, and match explanations (e.g., “Top match due to shared skills in AI and ML”).
- Optionally, allow mentees to provide feedback to further improve recommendations.

## Example Hybrid Score Calculation

```typescript
const hybridScore = 0.6 * semanticSkillScore + 0.3 * cfScore + 0.1 * (availabilityScore + reputationScore);
```
- `semanticSkillScore`: [0, 1] from semantic similarity.
- `cfScore`: 1 if mentor is in CF top-N, else 0.
- `availabilityScore`: 0.1 if available, else 0.
- `reputationScore`: (mentor.reputationScore / 5) * 0.1.

## References

- [LightFM: Hybrid Recommender](https://making.lyst.com/lightfm/docs/home.html)
- [Sentence Transformers](https://www.sbert.net/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## Contact

For questions or contributions, please contact the maintainers or open an issue in the repository.
