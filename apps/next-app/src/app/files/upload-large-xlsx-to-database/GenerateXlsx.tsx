"use client";

import { useState } from "react";
import { generateLargeExcelFile } from "./api";

export const GenerateXlsx = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateLargeExcel = async () => {
    setIsGenerating(true);

    try {
      const [validResult, invalidResult] = await Promise.all([
        generateLargeExcelFile("valid"),
        generateLargeExcelFile("invalid"),
      ]);

      alert(
        `Excel files generated successfully:\n` +
          `✅ Valid data: ${validResult.filename}\n` +
          `⚠️ Invalid data: ${invalidResult.filename}`,
      );
    } catch (error) {
      console.error("Error generating Excel files:", error);
      alert("Failed to generate Excel files");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Generate Large XLSX Test Data</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate Test Data Files</h2>
        <div className="space-y-3 mb-4">
          <p className="text-gray-600">
            Generate two Excel files with 500,000 rows each for comprehensive
            testing:
          </p>
          <div className="bg-green-50 border-l-4 border-green-400 p-3">
            <p className="text-sm text-green-700">
              <strong>✅ Valid Data File:</strong> Contains properly formatted
              data with correct Bio-IDs, valid names, and appropriate gender
              values for import testing.
            </p>
          </div>
          <div className="bg-orange-50 border-l-4 border-orange-400 p-3">
            <p className="text-sm text-orange-700">
              <strong>⚠️ Invalid Data File:</strong> Contains randomly inserted
              invalid entries including null values, malformed Bio-IDs, invalid
              genders, and empty fields to test error handling.
            </p>
          </div>
        </div>

        <button
          onClick={generateLargeExcel}
          disabled={isGenerating}
          className={`px-6 py-3 rounded-lg font-medium ${
            isGenerating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white transition-colors`}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Excel Files...
            </span>
          ) : (
            "Generate Test Files (Valid + Invalid)"
          )}
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <div className="space-y-2">
              <p className="text-sm text-blue-700">
                <strong>📁 File Location:</strong> Both generated files are saved
                in `apps/nest-app/temp` on the Nest server.
              </p>
              <p className="text-sm text-blue-700">
                <strong>🧪 Testing Strategy:</strong> Use the valid file for
                happy-path scenarios, and the invalid file to exercise error
                handling and data validation logic.
              </p>
              <p className="text-sm text-blue-700">
                <strong>⚡ Performance:</strong> Each file contains 500,000 rows
                to simulate real-world large dataset processing scenarios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
