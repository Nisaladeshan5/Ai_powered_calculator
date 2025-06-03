import google.generativeai as genai
import json
from PIL import Image
from constants import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

def analyze_image(img: Image, dict_of_vars: dict):
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
    dict_of_vars_str = json.dumps(dict_of_vars, ensure_ascii=False)
    
    prompt = (
        f"You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them. "
        f"Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right). "
        f"For example: "
        f"Q. 2 + 3 * 4 => 14, Q. 2 + 3 + 5 * 4 - 8 / 2 => 21. "
        f"THERE ARE FIVE POSSIBLE TYPES OF EXPRESSIONS OR EQUATIONS IN THIS IMAGE. ONLY ONE TYPE WILL APPEAR AT A TIME. Return the result in the format of a Python list of dicts, no explanation. The five cases are: "
        f"1. Simple expressions like 2 + 2 => return [{{'expr': '2 + 2', 'result': 4}}] "
        f"2. Equations like x + y = 5 and y = 2 => return [{{'expr': 'x', 'result': 3, 'assign': true}}, {{'expr': 'y', 'result': 2, 'assign': true}}] "
        f"3. Assignments like x = 5 => return [{{'expr': 'x', 'result': 5, 'assign': true}}] "
        f"4. Graphical math answers => return [{{'expr': 'describe expression', 'result': answer}}] "
        f"5. Abstract concept in image => return [{{'expr': 'description', 'result': 'concept'}}] "
        f"Use this dictionary for variable substitutions: {dict_of_vars_str}. "
        f"DO NOT RETURN ANY EXPLANATION. DO NOT USE BACKTICKS OR MARKDOWN. JUST RETURN A RAW JSON STRING EXACTLY LIKE THIS: "
        f'[{{"expr": "x", "result": 5, "assign": true}}]'
    )

    try:
        response = model.generate_content([prompt, img])
        raw_response = response.text.strip()
        print("=== Gemini Response Start ===")
        print(repr(raw_response))
        print("=== Gemini Response End ===")

        # Attempt parsing directly
        try:
            answers = json.loads(raw_response)
        except json.JSONDecodeError:
            # Clean wrapped markdown/code block if present
            cleaned = (
                raw_response
                .replace("```json", "")
                .replace("```", "")
                .replace("'", '"')
                .strip()
            )
            answers = json.loads(cleaned)
    except Exception as e:
        print(f"Error in parsing response from Gemini API: {e}")
        answers = []

    print('returned answer ', answers)

    # Ensure 'assign' key is always present
    for answer in answers:
        answer['assign'] = answer.get('assign', False)

    return answers
