import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import RandomOverSampler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score
import numpy as np
from sqlalchemy import create_engine
import shap
from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app)


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

def preprocess_data(df):
    one_hot_encoded = pd.get_dummies(df, columns=['Gender'])
    encoder = LabelEncoder()
    one_hot_encoded['Parental_Support_level'] = encoder.fit_transform(one_hot_encoded['ParentalSupport'])
    one_hot_encoded.drop('ParentalSupport', axis=1, inplace=True)
    # Underperform label
    one_hot_encoded["Underperform"] = one_hot_encoded["FinalGrade"].apply(lambda x: 1 if x < 70 else 0)
    feature_cols = ['AttendanceRate', 'StudyHoursPerWeek', 'PreviousGrade', 'FinalGrade', 'ExtracurricularActivities']
    scaler = StandardScaler()
    one_hot_encoded[feature_cols] = scaler.fit_transform(one_hot_encoded[feature_cols])
    print(one_hot_encoded)
    return one_hot_encoded, scaler, encoder

df = load_training_data()
df['DropoutRisk'] = df.apply(
    lambda row: 1 if row["AttendanceRate"] < 60 or row["ParentalSupport"] == "Low" or
                row["FinalGrade"] < 65 or row["StudyHoursPerWeek"] < 10 else 0, axis=1
)
df_processed, scaler, encoder = preprocess_data(df)

# Plot dropout risk distribution
plt.figure(figsize=(6, 4))
plt.hist(df['DropoutRisk'], bins=2, color='skyblue', edgecolor='black', rwidth=0.8)
plt.xlabel('Dropout Risk (0 = No, 1 = Yes)')
plt.ylabel('Number of Students')
plt.title('Dropout Risk Distribution (Histogram)')
plt.xticks([0, 1], labels=['No Risk', 'At Risk'])
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.show()

def oversample_train_test(df, target_col):
    y = df[target_col]
    X = df.drop(['DropoutRisk', 'Underperform', 'StudentID', 'Name', 'Email'], axis=1)
    # Note: drop both targets regardless because we train separately
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.4, random_state=42)
    oversampler = RandomOverSampler(random_state=42)
    X_train_oversampled, y_train_oversampled = oversampler.fit_resample(X_train, y_train)
    return X_train_oversampled, y_train_oversampled, X_test, y_test

def train_and_evaluate_model(x, y, X_test, y_test, model_name="Model"):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(RandomForestClassifier(n_estimators=100, random_state=42), x, y, cv=cv, scoring='f1_macro')
    print(f"{model_name} Average F1 Score:", scores.mean())

    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(x, y)
    y_pred = rf.predict(X_test)

    print(f"{model_name} Accuracy:", accuracy_score(y_test, y_pred))
    print(f"{model_name} ROC AUC Score:", roc_auc_score(y_test, y_pred))
    print(f"\n{model_name} Classification Report:\n", classification_report(y_test, y_pred))
    return rf

def shap_analysis(rf, X_train, y_train, X_test, model_name="Model"):
    explainer = shap.TreeExplainer(rf)
    shap_values = explainer.shap_values(X_test)
    shap_values_class1 = shap_values[:, :, 1]  # class 1 explanation

    print(f"{model_name} X_test shape:", X_test.shape)
    print(f"{model_name} X_test columns:", X_test.columns.tolist())
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

# Prepare data and train DropoutRisk model
X_train_drop, y_train_drop, X_test_drop, y_test_drop = oversample_train_test(df_processed, 'DropoutRisk')
rf_dropout = train_and_evaluate_model(X_train_drop, y_train_drop, X_test_drop, y_test_drop, "Dropout Risk Model")
trained_feature_order = X_train_drop.columns.tolist()
shap_analysis(rf_dropout, X_train_drop, y_train_drop, X_test_drop, "Dropout Risk Model")

# Prepare data and train Underperform model
X_train_up, y_train_up, X_test_up, y_test_up = oversample_train_test(df_processed, 'Underperform')
rf_underperform = train_and_evaluate_model(X_train_up, y_train_up, X_test_up, y_test_up, "Underperform Model")
trained_feature_order_up = X_train_up.columns.tolist()
shap_analysis(rf_underperform, X_train_up, y_train_up, X_test_up, "Underperform Model")

def predict_new_student(rf_dropout, rf_underperform, scaler, encoder, student_data, trained_columns_drop, trained_columns_up):
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

    # Build final input for dropout risk model
    final_input_drop = pd.DataFrame(scaled_numeric, columns=numeric_features)
    final_input_drop['Gender_Female'] = df['Gender_Female'].values
    final_input_drop['Gender_Male'] = df['Gender_Male'].values
    final_input_drop['Parental_Support_level'] = df['Parental_Support_level'].values
    final_input_drop = final_input_drop[trained_columns_drop]

    # Predict dropout risk
    dropout_pred = rf_dropout.predict(final_input_drop)[0]
    dropout_prob = rf_dropout.predict_proba(final_input_drop)[0][1]

    # Build final input for underperform model
    final_input_up = pd.DataFrame(scaled_numeric, columns=numeric_features)
    final_input_up['Gender_Female'] = df['Gender_Female'].values
    final_input_up['Gender_Male'] = df['Gender_Male'].values
    final_input_up['Parental_Support_level'] = df['Parental_Support_level'].values
    final_input_up = final_input_up[trained_columns_up]

    # Predict underperform risk
    underperform_pred = rf_underperform.predict(final_input_up)[0]
    underperform_prob = rf_underperform.predict_proba(final_input_up)[0][1]

    return (dropout_pred, dropout_prob), (underperform_pred, underperform_prob)


@app.route('/predict', methods=['POST'])
def predict():
    data = request.json

    # Step 1: Predict risks
    dropout, dropout_prob = predict_new_student(rf_dropout, scaler, encoder, data, trained_feature_order)
    underperform, underperform_prob = predict_new_student(rf_underperform, scaler, encoder, data, trained_feature_order)

    # Step 2: Insert into DB
    engine = get_db_connection()
    df = pd.DataFrame([data])
    df["dropout_risk"] = dropout
    df["underperform_risk"] = underperform
    df["dropout_probability"] = round(dropout_prob, 2)
    df["underperform_probability"] = round(underperform_prob, 2)
    df["advisor_email"] = data.get("advisor_email", "unknown")

    df.to_sql("predicted_students", engine, if_exists="append", index=False)

    return jsonify({
        "dropout_risk": dropout,
        "underperform_risk": underperform,
        "dropout_probability": dropout_prob,
        "underperform_probability": underperform_prob
    })

if __name__ == '__main__':
    app.run(debug=True)
