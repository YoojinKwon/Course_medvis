from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)


class Patient(BaseModel):
  name: str
  age: int
  department: str
  notes: str = ""


patients_db: list[dict] = []
next_id = 1


@app.get("/api/patients")
def list_patients():
  return {"patients": patients_db, "count": len(patients_db)}


@app.post("/api/patients", status_code=201)
def create_patient(patient: Patient):
  global next_id
  record = {"id": next_id, **patient.model_dump()}
  patients_db.append(record)
  next_id += 1
  return record


@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: int):
  for p in patients_db:
    if p["id"] == patient_id:
      return p
  raise HTTPException(status_code=404, detail="Patient not found")


@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int):
  global patients_db
  before = len(patients_db)
  patients_db = [p for p in patients_db if p["id"] != patient_id]
  if len(patients_db) == before:
    raise HTTPException(status_code=404, detail="Patient not found")
  return {"message": f"Patient {patient_id} deleted"}
