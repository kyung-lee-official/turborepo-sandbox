import { Injectable } from "@nestjs/common";

@Injectable()
export class MockDataService {
  mockData: any[] = [];

  constructor() {
    this.mockData = [
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Smith" },
      { id: 3, name: "Alice Johnson" },
      { id: 4, name: "Bob Brown" },
      { id: 5, name: "Charlie Black" },
      { id: 6, name: "Diana White" },
      { id: 7, name: "Eve Green" },
      { id: 8, name: "Frank Blue" },
      { id: 9, name: "Grace Yellow" },
      { id: 10, name: "Hank Purple" },
      { id: 11, name: "Ivy Orange" },
      { id: 12, name: "Jack Pink" },
      { id: 13, name: "Kathy Gray" },
      { id: 14, name: "Leo Cyan" },
      { id: 15, name: "Mia Magenta" },
      { id: 16, name: "Nina Teal" },
      { id: 17, name: "Oscar Brown" },
      { id: 18, name: "Paul Red" },
      { id: 19, name: "Quinn Blue" },
      { id: 20, name: "Rita Green" },
      { id: 21, name: "Sam Yellow" },
      { id: 22, name: "Tina Orange" },
      { id: 23, name: "Uma Pink" },
      { id: 24, name: "Vera Purple" },
      { id: 25, name: "Will Black" },
      { id: 26, name: "Xena White" },
      { id: 27, name: "Yara Gray" },
      { id: 28, name: "Zane Cyan" },
      { id: 29, name: "Aaron Magenta" },
      { id: 30, name: "Bella Teal" },
    ];
  }

  async search(term: string) {
    if (!term.trim()) {
      return [];
    }

    const res = this.mockData.filter((item) =>
      item.name.toLowerCase().includes(term.toLowerCase()),
    );
    return res;
  }
}
