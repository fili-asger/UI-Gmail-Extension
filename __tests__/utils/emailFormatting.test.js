const {
  formatEmailContent,
  formatResponseForGmail,
} = require("../../utils/emailFormatting");

describe("Email Formatting Utilities", () => {
  describe("formatEmailContent", () => {
    it("should return empty string for null or undefined input", () => {
      expect(formatEmailContent(null)).toBe("");
      expect(formatEmailContent(undefined)).toBe("");
      expect(formatEmailContent("")).toBe("");
    });

    it("should convert single line breaks to <br> tags", () => {
      const input = "Line one\nLine two";
      const expected = "Line one<br>Line two";
      expect(formatEmailContent(input)).toBe(expected);
    });

    it("should convert multiple line breaks to <div><br></div>", () => {
      const input = "Paragraph one\n\nParagraph two";
      const expected = "Paragraph one<div><br></div>Paragraph two";
      expect(formatEmailContent(input)).toBe(expected);
    });

    it("should handle a mixture of single and multiple line breaks", () => {
      const input =
        "Title\nSubtitle\n\nParagraph one\nContinuation\n\nParagraph two";
      const expected =
        "Title<br>Subtitle<div><br></div>Paragraph one<br>Continuation<div><br></div>Paragraph two";
      expect(formatEmailContent(input)).toBe(expected);
    });

    it("should handle excessive line breaks correctly", () => {
      const input = "Paragraph one\n\n\n\nParagraph two";
      const expected = "Paragraph one<div><br></div>Paragraph two";
      expect(formatEmailContent(input)).toBe(expected);
    });
  });

  describe("formatResponseForGmail", () => {
    it("should return empty string for null or undefined input", () => {
      expect(formatResponseForGmail(null)).toBe("");
      expect(formatResponseForGmail(undefined)).toBe("");
      expect(formatResponseForGmail("")).toBe("");
    });

    it("should normalize excessive line breaks", () => {
      const input = "Paragraph one\n\n\n\nParagraph two";
      expect(formatResponseForGmail(input)).toContain(
        "Paragraph one<div><br></div>Paragraph two"
      );
    });

    it("should add breaks after email greetings", () => {
      const inputs = [
        "Hi John,\nContent",
        "Hello Team,\nContent",
        "Dear Mr. Smith,\nContent",
        "Greetings,\nContent",
      ];

      inputs.forEach((input) => {
        const result = formatResponseForGmail(input);
        expect(result).toContain(",<div><br></div>");
      });
    });

    it("should add breaks before email closings", () => {
      const inputs = [
        "Content.\nBest regards,",
        "Content!\nKind regards,",
        "Content?\nSincerely,",
        "Content.\nThank you,",
      ];

      inputs.forEach((input) => {
        const result = formatResponseForGmail(input);
        // The closing should be separated by a <div><br></div>
        expect(result).toMatch(
          /(\.|!|\?)<div><br><\/div>(Best|Kind|Sincerely|Thank)/
        );
      });
    });

    it("should add breaks after email closings", () => {
      const inputs = [
        "Best regards,\nJohn",
        "Kind regards,\nTeam",
        "Sincerely,\nDoe",
        "Thank you,\nSmith",
      ];

      inputs.forEach((input) => {
        const result = formatResponseForGmail(input);
        expect(result).toMatch(/(regards|Sincerely|you),<div><br><\/div>/);
      });
    });

    it("should format a complete email correctly", () => {
      const input =
        "Hi John,\n" +
        "I hope this email finds you well.\n\n" +
        "I wanted to follow up on our discussion from last week.\n" +
        "Could we schedule a meeting to discuss the project further?\n\n" +
        "Best regards,\n" +
        "Jane";

      const result = formatResponseForGmail(input);

      // Check greeting
      expect(result).toContain("Hi John,<div><br></div>");

      // Check body paragraphs
      expect(result).toContain(
        "I hope this email finds you well.<div><br></div>"
      );

      // Check line break within a paragraph
      expect(result).toContain(
        "Could we schedule a meeting to discuss the project further?<div><br></div>"
      );

      // Check closing
      expect(result).toContain("Best regards,<div><br></div>Jane");
    });
  });
});
