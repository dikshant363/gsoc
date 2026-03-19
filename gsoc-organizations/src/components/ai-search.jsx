import React, { useState } from 'react';
import { Button, Form, TextArea, Message, Card, Icon, Label } from 'semantic-ui-react';
import './ai-search.css';

const AiSearch = ({ onSearchComplete }) => {
    const [profile, setProfile] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);

    const handleSubmit = async () => {
        if (!profile.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch('http://localhost:3001/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ profile }),
            });

            if (!response.ok) {
                throw new Error('Failed to connect to AI service');
            }

            const data = await response.json();
            setResults(data.recommendations);
            if (onSearchComplete) onSearchComplete(data.recommendations);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please ensure the AI server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-search-container">
            <div className="ai-search-header">
                <h3><Icon name="magic" /> AI Matchmaker</h3>
                <p>Paste your bio, skills, or project ideas. We'll find your best GSoC fit.</p>
            </div>

            <Form error={!!error}>
                <TextArea
                    placeholder="e.g. I am a Python student interested in biology and machine learning. I know PyTorch..."
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    rows={3}
                    style={{ minHeight: '80px', borderRadius: '8px', marginBottom: '10px' }}
                />
                <Button
                    primary
                    loading={loading}
                    disabled={!profile.trim() || loading}
                    onClick={handleSubmit}
                    className="ai-search-button"
                >
                    Find Matches
                </Button>
                <Message error header="Error" content={error} />
            </Form>

            {results && (
                <div className="ai-results-section">
                    <h4>Top Recommendations</h4>
                    <Card.Group itemsPerRow={3} stackable>
                        {results.map((rec, idx) => (
                            <Card key={idx} href={rec.url} target="_blank" rel="noopener noreferrer" className="ai-result-card">
                                <Card.Content>
                                    <Card.Header>{rec.name}</Card.Header>
                                    <Card.Meta>Match Score: {(rec.score * 100).toFixed(0)}%</Card.Meta>
                                    <Card.Description>
                                        {rec.reasoning}
                                    </Card.Description>
                                </Card.Content>
                                <Card.Content extra>
                                    <Label size="tiny"><Icon name="external" /> Visit Org</Label>
                                </Card.Content>
                            </Card>
                        ))}
                    </Card.Group>
                </div>
            )}
        </div>
    );
};

export default AiSearch;
