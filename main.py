import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import RandomOverSampler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score
import numpy as np
from sqlalchemy import create_engine
import shap

pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'semsem555',
    'database': 'riskly'
}

def get_db_connection():
    return create_engine(
        f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}/{DB_CONFIG['database']}"
)

def load_training_data():
    """Load data from students table"""
    engine = get_db_connection()
    query = "SELECT * FROM students"
    print("Executing query:", pd.read_sql(query, engine))
    return pd.read_sql(query, engine)

def load_risks():
    """Load data from student_risks table"""
    engine = get_db_connection()
    query = "SELECT * FROM risks"
    print("Executing query:", pd.read_sql(query, engine))
    return pd.read_sql(query, engine)

def preprocess_data(df):
    one_hot_encoded = pd.get_dummies(df, columns=['Gender'])
    encoder = LabelEncoder()
    one_hot_encoded['Parental_Support_level'] = encoder.fit_transform(one_hot_encoded['ParentalSupport'])
    one_hot_encoded.drop('ParentalSupport', axis=1, inplace=True)
    # Soften criteria to identify at-risk students
    one_hot_encoded["Underperform"] = one_hot_encoded["FinalGrade"].apply(lambda x: 1 if x < 70 else 0)
    feature_cols = ['AttendanceRate', 'StudyHoursPerWeek', 'PreviousGrade', 'FinalGrade','ExtracurricularActivities']
    scaler = StandardScaler()
    one_hot_encoded[feature_cols] = scaler.fit_transform(one_hot_encoded[feature_cols])
    print(one_hot_encoded)
    return one_hot_encoded,scaler,encoder

df = load_training_data()
df['DropoutRisk'] = df.apply(
    lambda row: 1 if row["AttendanceRate"] < 60 or row["ParentalSupport"] == "Low" or 
                row["FinalGrade"] < 65 or row["StudyHoursPerWeek"] < 10 else 0, axis=1
)
df_processed,scaler,encoder = preprocess_data(df)


load_risks()

plt.figure(figsize=(6, 4))
plt.hist(df['DropoutRisk'], bins=2, color='skyblue', edgecolor='black', rwidth=0.8)
plt.xlabel('Dropout Risk (0 = No, 1 = Yes)')
plt.ylabel('Number of Students')
plt.title('Dropout Risk Distribution (Histogram)')
plt.xticks([0, 1], labels=['No Risk', 'At Risk'])
plt.grid(axis='y', linestyle='--', alpha=0.7)

plt.tight_layout()
plt.show()

y = df_processed['DropoutRisk']
X = df_processed.drop(['DropoutRisk', 'Underperform','StudentID', 'Name','Email'], axis=1)
def oversample_test_data(df):
    y = df['DropoutRisk']
    X = df.drop(['DropoutRisk', 'Underperform', 'StudentID', 'Name','Email'], axis=1)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.4, random_state=42)

    oversampler = RandomOverSampler(random_state=42)
    X_train_oversampled, y_train_oversampled = oversampler.fit_resample(X_train, y_train)

    return X_train_oversampled, y_train_oversampled, X_test, y_test


X_train_oversampled, y_train_oversampled, X_test, y_test = oversample_test_data(df_processed)

plt.figure(figsize=(6, 4))
plt.hist(y_train_oversampled, bins=2, color='skyblue', edgecolor='black', rwidth=0.8)

plt.xlabel('Dropout Risk (0 = No, 1 = Yes)')
plt.ylabel('Number of Students')
plt.title('Dropout Risk Distribution After Oversampling')
plt.xticks([0, 1], labels=['No Risk', 'At Risk'])
plt.grid(axis='y', linestyle='--', alpha=0.7)

plt.tight_layout()
plt.show()

def train_and_evaluate_model(x, y, X_test, y_test):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(RandomForestClassifier(n_estimators=100, random_state=42), x, y, cv=cv, scoring='f1_macro')
    print("Average F1 Score:", scores.mean())

    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(x, y)
    y_pred = rf.predict(X_test)

    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("ROC AUC Score:", roc_auc_score(y_test, y_pred))
    print("\nClassification Report:\n", classification_report(y_test, y_pred))
    return rf


def shap_analysis(rf,X_train, y_train, X_test):
    explainer = shap.TreeExplainer(rf)
    shap_values = explainer.shap_values(X_test)


    shap_values_class1 = shap_values[:, :, 1]

    print("X_test shape:", X_test.shape)
    print("X_test columns:", X_test.columns.tolist())

    print("Type of shap_values:", type(shap_values))
    if isinstance(shap_values, list):
        print("Number of classes (shap_values list length):", len(shap_values))
        for i, val in enumerate(shap_values):
            print(f"shap_values[{i}] shape:", val.shape)
    else:
        print("shap_values shape:", shap_values.shape)

    shap.summary_plot(shap_values_class1, X_test)

    base_value = explainer.expected_value[1]

    shap.decision_plot(
        base_value,
        shap_values_class1[0],
        X_test.iloc[0]
    )
    
        
rf=train_and_evaluate_model(X_train_oversampled, y_train_oversampled, X_test, y_test)
trained_feature_order = X_train_oversampled.columns.tolist()
shap_analysis(rf,X_train_oversampled, y_train_oversampled, X_test)

def predict_new_student(rf, scaler, encoder, student_data, trained_columns):
    df = pd.DataFrame([student_data])

    # Encode parental support
    df['Parental_Support_level'] = encoder.transform(df['ParentalSupport'])
    df.drop('ParentalSupport', axis=1, inplace=True)

    # One-hot encode gender
    df['Gender_Female'] = 1 if student_data.get('Gender') == 'Female' else 0
    df['Gender_Male'] = 1 if student_data.get('Gender') == 'Male' else 0

    # Scale numeric features
    numeric_features = ['AttendanceRate', 'StudyHoursPerWeek', 'PreviousGrade', 'FinalGrade', 'ExtracurricularActivities']
    scaled_numeric = scaler.transform(df[numeric_features])

    # Build final input
    final_input = pd.DataFrame(scaled_numeric, columns=numeric_features)
    final_input['Gender_Female'] = df['Gender_Female'].values
    final_input['Gender_Male'] = df['Gender_Male'].values
    final_input['Parental_Support_level'] = df['Parental_Support_level'].values

    # Ensure column order matches training
    final_input = final_input[trained_columns]

    # Predict
    prediction = rf.predict(final_input)[0]
    probability = rf.predict_proba(final_input)[0][1]

    return prediction, probability



new_student = {
    "AttendanceRate": 55.0,
    "StudyHoursPerWeek": 5.0,
    "PreviousGrade": 60.0,
    "FinalGrade": 58.0,
    "ParentalSupport": "Low",
    "Gender": "Female",
    "ExtracurricularActivities": 2.0
}


risk, prob = predict_new_student(rf, scaler, encoder, new_student, trained_feature_order)

print("Predicted Dropout Risk:", "At Risk" if risk else "No Risk", f"(Probability: {prob:.2f})")
