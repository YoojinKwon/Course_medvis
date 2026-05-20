# README File for Medication Extraction Labels for MIMIC-IV-Note Clinical Database

## Overview

This repository contains the Medication Extraction Labels for the MIMIC-IV-Note Clinical Database. It includes annotated labels for a subset of discharge summaries from the MIMIC-IV-Note dataset, designed to support research in clinical informatics.

## Data Description

The dataset comprises CSV files corresponding to discharge summaries from the MIMIC-IV-Note dataset. These files are annotated with details about medications, such as name, dosage, administration mode, frequency, duration, and reason for administration. Each medication detail is grouped and assigned a unique identifier.

### CSV File Format

The CSV files include the following columns:

- **Start Position:** The starting character position of the annotated text in the source document.
- **End Position:** The ending character position.
- **Annotation:** The type of annotation (e.g., REASON, MEDICATION, MODE, DURATION).
- **Group:** A unique identifier for each medication group.

## Usage Notes

These labels can be mapped to their corresponding discharge summaries in the MIMIC-IV-Note dataset using the 'note_id'. The 'start position' and 'end position' fields allow for locating entity labels within the text. The repository includes a Python code for integrating the MIMIC-IV-Note textual data with the label data.

### Python Code Example

```python
import os
import re
import pandas as pd

def import_mimic_iv_text(
    mimic_iv_discharge_df: pd.DataFrame,
    label_dir_path: str,
    label_filename: str,
) -> pd.DataFrame:
    """Imports MIMIC-IV-Note data into a “Text” column of the label dataframe.

    Parameters:
    mimic_iv_discharge_df (pd.DataFrame): DataFrame containing discharge
    summaries from MIMIC-IV-Note discharge.csv.gz.
    label_dir_path (str): The directory path of label CSV files.
    label_filename (str): The filename of a label CSV file.

    Returns:
    pd.DataFrame: The DataFrame with labels and associated MIMIC-IV text.
    """
    note_id = extract_note_id(label_filename)
    document_row = mimic_iv_discharge_df.loc[
        mimic_iv_discharge_df.note_id == note_id
    ]

    document_text = document_row.text.iloc[0]

    label_df = pd.read_csv(os.path.join(label_dir_path, label_filename))
    label_df["Text"] = None

    # Mapping each label to its corresponding text
    for idx, row in label_df.iterrows():
        text_slice = slice(row["Start Position"], row["End Position"])
        label_df.at[idx, "Text"] = document_text[text_slice]

    return label_df

def extract_note_id(s: str) -> str:
    """Extracts the note id from a string containing 'NoteID-' followed by the actual note id.

    Parameters:
    s (str): The string to extract the note id from.

    Returns:
    str: The extracted note id.

    Raises:
    ValueError: If the note id cannot be extracted.
    """
    match = re.search(r"NoteID-([0-9A-Za-z-]+)", s)
    if match:
        return match.group(1)
    else:
        raise ValueError(f"Could not extract note_id from {s}")

```