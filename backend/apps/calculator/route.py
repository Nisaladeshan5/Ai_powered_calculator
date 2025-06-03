from fastapi import APIRouter
from typing import List
import base64
from io import BytesIO
from PIL import Image
from apps.calculator.utils import analyze_image
from schema import ImageData
from pydantic import BaseModel

router = APIRouter()

class AnalyzeResponse(BaseModel):
    expr: str
    result: object
    assign: bool

class AnalyzeResult(BaseModel):
    message: str
    data: List[AnalyzeResponse]
    status: str

@router.post("/", response_model=AnalyzeResult)
async def run(data: ImageData) -> AnalyzeResult:
    # Decode base64 image (assumes data:image/png;base64,...)
    image_data = base64.b64decode(data.image.split(",")[1])
    image_bytes = BytesIO(image_data)
    image = Image.open(image_bytes)

    responses = analyze_image(image, dict_of_vars=data.dict_of_vars)

    # Assuming analyze_image returns list of AnalyzeResponse-compatible dicts or objects
    data_list = [AnalyzeResponse(**resp) if isinstance(resp, dict) else resp for resp in responses]

    return AnalyzeResult(message="Image processed", data=data_list, status="success")
