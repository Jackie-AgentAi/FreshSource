import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { client } from '@/api/client';

export default function HomePage() {
  const [buyerPing, setBuyerPing] = useState('checking');

  useEffect(() => {
    client
      .get('/api/v1/buyer/ping')
      .then((resp) => {
        if (resp.data?.code === 0) {
          setBuyerPing('ok');
        } else {
          setBuyerPing('failed');
        }
      })
      .catch(() => setBuyerPing('failed'));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>订货端首页</Text>
      <Text style={{ marginTop: 12 }}>buyer 路由鉴权检测：{buyerPing}</Text>
    </View>
  );
}
