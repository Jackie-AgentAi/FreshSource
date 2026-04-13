import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { client } from '@/api/client';

export default function WorkbenchPage() {
  const [sellerPing, setSellerPing] = useState('checking');

  useEffect(() => {
    client
      .get('/api/v1/seller/ping')
      .then((resp) => {
        if (resp.data?.code === 0) {
          setSellerPing('ok');
        } else {
          setSellerPing('failed');
        }
      })
      .catch(() => setSellerPing('failed'));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>发货端工作台</Text>
      <Text style={{ marginTop: 12 }}>seller 路由鉴权检测：{sellerPing}</Text>
    </View>
  );
}
