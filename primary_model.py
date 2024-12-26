import pandas as pd

# Load disease and drug datasets
disease_list = pd.read_csv('Disease.csv')['Disease'].tolist()
drug_list = pd.read_csv('Drugs.csv')['Drug'].tolist()

# Function to extract drug names from text
def extract_drug_names(text):
    text = text.lower()
    found_drugs = [drug for drug in drug_list if drug.lower() in text]
    return found_drugs

# Function to extract diseases from text
def extract_diseases(text):
    text = text.lower()
    found_diseases = [disease for disease in disease_list if disease.lower() in text]
    return found_diseases

# Dummy function for disease prediction
def predict_disease(symptoms):
    return symptoms[0] if symptoms else None  # Can be refined for a more sophisticated prediction

def generate_prescription(diseases, drugs):
    if not diseases and not drugs:
        return "No prescription available. Please mention symptoms and medications."

    # Create pairs of disease and corresponding drug
    prescription = []
    for disease in diseases:
        for drug in drugs:
            prescription.append(f"{disease} : {drug}")

    # If there are no drug pairs, fall back to just diseases or drugs
    if not prescription:
        prescription = [f"{disease}" for disease in diseases] + [f"{drug}" for drug in drugs]

    return ", ".join(prescription).strip()


# Function to process transcribed text, extract features, and generate prescription
def process_text(text):
    print(f"Processing input: {text}")

    # Extract diseases and drugs
    diseases = extract_diseases(text)
    drugs = extract_drug_names(text)

    # Predict disease based on symptoms (if any)
    predicted_disease = predict_disease(diseases)

    # Generate a prescription
    prescription = generate_prescription(diseases, drugs)
    print(f"Generated Prescription: {prescription}")
    
    # Return the processed information as a dictionary (to be sent to backend)
    result = {
        "diseases": diseases,
        "drugs": drugs,
        "predicted_disease": predicted_disease,
        "prescription": prescription
    }

    return result

# Example call to test the process
if __name__ == "__main__":
    print(process_text("This model is being run directly, its note being imported by secondary_model.py"))
