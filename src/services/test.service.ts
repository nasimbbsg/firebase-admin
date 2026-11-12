import { randomUUID } from "node:crypto";
import type { CreateTestInput } from "../schemas/test.schema.js";

export interface TestRecord extends CreateTestInput {
  id: string;
  createdAt: string;
}

export class TestService {
  private readonly tests = new Map<string, TestRecord>();

  create(input: CreateTestInput): TestRecord {
    const record: TestRecord = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };

    this.tests.set(record.id, record);

    return record;
  }

  findAll(): TestRecord[] {
    return Array.from(this.tests.values());
  }

  findById(id: string): TestRecord | undefined {
    return this.tests.get(id);
  }

  delete(id: string): boolean {
    return this.tests.delete(id);
  }
}
